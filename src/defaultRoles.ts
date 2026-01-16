import type { SystemRole } from './types'
import { t } from './i18n'

/**
 * Essential system role - always created by the plugin
 * This is the only hardcoded role as it's required for the system to function
 */
export const getSuperAdminRole = (): SystemRole => ({
  name: 'super_admin',
  label: t('defaultRoles.superAdmin.label'),
  permissions: ['*'],
  protected: true,
  active: true,
  description: t('defaultRoles.superAdmin.description'),
})

// Backward compatibility - returns role with current translations
export const SUPER_ADMIN_ROLE = getSuperAdminRole()

/**
 * Public role for non-authenticated users
 * This role is automatically applied when no user is logged in
 */
export const getPublicRole = (permissions: string[] = ['*.read']): SystemRole => ({
  name: 'public',
  label: t('defaultRoles.public.label'),
  permissions,
  protected: true,
  active: true,
  description: t('defaultRoles.public.description'),
  visibleFor: [], // Not visible in UI for assignment
})

// Backward compatibility - returns role with current translations
export const PUBLIC_ROLE = getPublicRole()

/**
 * Example role configurations that can be used in the plugin config
 * These are NOT automatically created - they must be explicitly configured
 */
export const getExampleRoles = () => ({
  admin: {
    name: 'admin',
    label: t('defaultRoles.admin.label'),
    permissions: [
      // Backend users management (no role management)
      'backend-users.read',
      'backend-users.create',
      'backend-users.update',
      'backend-users.delete',
      // Frontend users management
      'users.read',
      'users.create',
      'users.update',
      'users.delete',
      // Media management
      'media.read',
      'media.create',
      'media.update',
      'media.delete',
    ],
    protected: false,
    active: true,
    description: t('defaultRoles.admin.description'),
  },
  editor: {
    name: 'editor',
    label: t('defaultRoles.editor.label'),
    permissions: [
      // Read-only for users
      'backend-users.read',
      'users.read',
      // Full media access
      'media.read',
      'media.create',
      'media.update',
      'media.delete',
    ],
    protected: false,
    active: true,
    description: t('defaultRoles.editor.description'),
  },
  user: {
    name: 'user',
    label: t('defaultRoles.user.label'),
    permissions: [
      // Users can only manage their own profile (enforced at row level)
      'users.read',
      'users.update',
      // Media for profile pictures
      'media.create',
      'media.read',
    ],
    protected: false,
    active: true,
    description: t('defaultRoles.user.description'),
  },
})

// Backward compatibility - returns roles with current translations
export const EXAMPLE_ROLES = getExampleRoles()
