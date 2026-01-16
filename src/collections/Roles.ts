import type { CollectionConfig, CollectionBeforeDeleteHook, CollectionBeforeChangeHook, CollectionAfterChangeHook } from 'payload'
import { ValidationError, Forbidden } from 'payload'

import { checkPermission } from '../utils/checkPermission'
import { formatLabel } from '../utils/formatLabel'
import { generateCollectionPermissions } from '../utils/generatePermissions'
import { DEFAULT_SUPER_ADMIN_ROLE } from '../constants'
import { getRolesSlug } from '../utils/getRolesSlug'
import { t } from '../i18n'

import type { GatekeeperOptions } from '../types'

export const createRolesCollection = (
  collections: CollectionConfig[],
  options: GatekeeperOptions = {},
  adminCollectionSlug?: string
): CollectionConfig => {
  const rolesSlug = options.rolesSlug || 'roles'

  // Create a placeholder for the roles collection itself to include in permission generation
  const rolesPlaceholder: CollectionConfig = {
    slug: rolesSlug,
    fields: [],
  }

  // Include the roles collection in the permissions list
  const collectionsWithRoles = [...collections, rolesPlaceholder]

  return {
    slug: rolesSlug,
    admin: {
      useAsTitle: 'label',
      defaultColumns: ['label', 'name', 'permissions', 'active'],
      description: t('collections.roles.description'),
      group: options.rolesGroup || 'System',
      // Hidden function will be added by the wrapper based on roles.manage permission
    },
  access: {
    // All authenticated users can read roles (needed for relationships)
    read: async ({ req }) => {
      // Allow reading roles during first user setup
      if (!req.user) {
        // Check if this is the first user setup in the admin collection
        // Only the admin collection (config.admin.user) matters for first user setup
        if (adminCollectionSlug) {
          try {
            const userCount = await req.payload.count({
              collection: adminCollectionSlug as 'users',
            })
            // Allow access only if no users exist in the admin collection
            return userCount.totalDocs === 0
          } catch (error) {
            // If we can't count, deny access for security
            console.error('Error checking admin user count for roles access:', error)
            return false
          }
        }
        // No admin collection configured, deny access
        return false
      }
      return true
    },
    create: async ({ req: { user, payload } }) => {
      if (!user || !('role' in user) || !user.role) return false
      return await checkPermission(payload, user.role, 'roles.create')
    },
    update: async ({ req: { user, payload } }) => {
      if (!user || !('role' in user) || !user.role) return false
      return await checkPermission(payload, user.role, 'roles.update')
    },
    delete: async ({ req: { user, payload }, id }) => {
      if (!user || !('role' in user) || !user.role) return false

      // Check if user has delete permission
      const hasDeletePermission = await checkPermission(payload, user.role, 'roles.delete')
      if (!hasDeletePermission) return false

      // Check if the role is protected (cannot be deleted even by super admin)
      if (id) {
        try {
          const role = await payload.findByID({
            collection: getRolesSlug() as 'roles',
            id,
            depth: 0
          })
          if (role?.protected) {
            return false // Protected roles cannot be deleted by anyone
          }
        } catch (error) {
          // If we can't find the role, allow the delete attempt (will fail in beforeDelete hook)
          console.warn('Could not check if role is protected:', error)
        }
      }

      return true
    },
  },
  fields: [
    // UI-only field to show protected role notice at the top of the form
    {
      type: 'ui',
      name: 'protectedNotice',
      admin: {
        condition: (data) => data?.protected === true,
        components: {
          Field: {
            path: 'payload-gatekeeper/components/ProtectedRoleNotice',
            exportName: 'ProtectedRoleNotice',
          },
        },
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: t('collections.roles.fields.name.description'),
      },
    },
    {
      name: 'label',
      type: 'text',
      required: true,
      admin: {
        description: t('collections.roles.fields.label.description'),
      },
    },
    {
      name: 'permissions',
      type: 'select',
      hasMany: true,
      required: false,
      options: generateCollectionPermissions(collectionsWithRoles, options.customPermissions).map(perm => ({
        label: perm.label,
        value: perm.value,
      })),
      admin: {
        description: t('collections.roles.fields.permissions.description'),
        className: 'permissions-select-field',
        components: {
          Field: {
            path: 'payload-gatekeeper/components/PermissionsSelectWrapper',
            exportName: 'PermissionsSelectWrapper',
          },
        },
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: t('collections.roles.fields.description.description'),
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      required: true,
      admin: {
        description: t('collections.roles.fields.active.description'),
        condition: (data) => {
          // Hide the active checkbox for protected roles (they must always be active)
          return !data?.protected
        },
      },
    },
    {
      name: 'protected',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        hidden: true, // Hide from UI, only used internally
      },
    },
    // System management fields for role synchronization
    {
      name: 'configHash',
      type: 'text',
      label: 'Configuration Hash',
      admin: {
        hidden: true,
        readOnly: true,
        description: t('collections.roles.fields.configHash.description'),
      },
    },
    {
      name: 'configVersion',
      type: 'number',
      label: 'Configuration Version',
      defaultValue: 0,
      admin: {
        hidden: true,
        readOnly: true,
        description: t('collections.roles.fields.configVersion.description'),
      },
    },
    {
      name: 'systemManaged',
      type: 'checkbox',
      label: 'System Managed',
      defaultValue: false,
      admin: {
        hidden: true,
        description: t('collections.roles.fields.systemManaged.description'),
      },
    },
    {
      name: 'visibleFor',
      type: 'select',
      hasMany: true,
      required: false,
      options: collections
        .filter(c => c.auth === true || (c.auth && typeof c.auth === 'object'))
        .map(c => ({
          label: c.labels?.singular || formatLabel(c.slug),
          value: c.slug,
        })),
      admin: {
        description: t('collections.roles.fields.visibleFor.description'),
      },
    },
  ],
  hooks: {
    beforeChange: [
      (async ({ data, operation, originalDoc, req }) => {
        // Skip permission checks if configured
        const shouldSkip =
          typeof options.skipPermissionChecks === 'function'
            ? options.skipPermissionChecks()
            : options.skipPermissionChecks

        if (shouldSkip) {
          return data
        }

        const user = req.user

        // Check if current user is super admin
        let isSuperAdmin = false
        if (user && 'role' in user) {
          isSuperAdmin = await checkPermission(
            req.payload,
            user.role,
            '*',
            user.id
          )
        }

        // Restrict protected role updates (applies to everyone including super admins)
        if (originalDoc?.protected && operation === 'update') {
          // Prevent name changes for protected roles
          if (data.name && data.name !== originalDoc.name) {
            throw new ValidationError({
              collection: getRolesSlug(),
              errors: [
                {
                  message: t('collections.roles.errors.nameCannotChange'),
                  path: 'name',
                }
              ]
            })
          }
        }

        // Prevent super admin from removing * permission from THEIR OWN role
        if (isSuperAdmin && operation === 'update' && user) {
          // Get the user's current role ID
          const userRoleId = user.role && typeof user.role === 'object' && 'id' in user.role
            ? user.role.id
            : user.role

          // Check if this is the user's current role
          const isUpdatingOwnRole = userRoleId === originalDoc?.id

          // If updating own role and permissions are being changed
          if (isUpdatingOwnRole && data.permissions !== undefined) {
            if (!data.permissions.includes('*')) {
              throw new ValidationError({
                collection: getRolesSlug(),
                errors: [
                  {
                    message: t('collections.roles.errors.cannotRemoveSuperAdmin'),
                    path: 'permissions',
                  }
                ]
              })
            }
          }
        }

        // Super admins can update any protected roles (after checks above)
        if (isSuperAdmin) {
          // Ensure protected roles are always active
          if (originalDoc?.protected && operation === 'update') {
            data.active = true
          }
          return data
        }

        // Non-super admins: additional restrictions for protected roles
        if (originalDoc?.protected && operation === 'update') {
          // Filter out system fields that Payload might include
          const systemFields = ['id', 'createdAt', 'updatedAt', '_status', 'configHash', 'configVersion', 'active', 'name']
          const dataFields = Object.keys(data || {}).filter(
            field => !systemFields.includes(field)
          )

          // Check if any non-allowed fields are being updated
          const allowedFields = ['description', 'permissions']
          const disallowedFields = dataFields.filter(
            field => !allowedFields.includes(field)
          )

          if (disallowedFields.length > 0) {
            throw new ValidationError({
              collection: getRolesSlug(),
              errors: disallowedFields.map(field => ({
                message: t('collections.roles.errors.protectedFieldCannotModify', { field }),
                path: field,
              }))
            })
          }

          // Force active to true for protected roles
          data.active = true
        }

        return data
      }) satisfies CollectionBeforeChangeHook,
    ],
    beforeDelete: [
      (async ({ id, req }) => {
        const doc = await req.payload.findByID({ collection: getRolesSlug() as 'roles', id })
        if (doc?.protected) {
          // Use Forbidden error for unauthorized deletion attempts
          const error = new Forbidden()
          error.message = t('collections.roles.errors.protectedCannotDelete', { label: doc.label || doc.name })
          throw error
        }
      }) satisfies CollectionBeforeDeleteHook,
    ],
    afterChange: [
      (async ({ doc, operation }) => {
        // Create super admin role if it doesn't exist
        if (operation === 'create' && doc.name === DEFAULT_SUPER_ADMIN_ROLE.name) {
          console.info(t('messages.superAdminRoleCreated'))
        }
        return doc
      }) satisfies CollectionAfterChangeHook,
    ],
  },
  timestamps: true,
  }
}
