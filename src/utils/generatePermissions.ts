import type { CollectionConfig } from 'payload'
import { CRUD_OPERATIONS, PERMISSIONS } from '../constants'
import type { Permission } from '../types'
import { formatLabel } from './formatLabel'
import { t } from '../i18n'

// Pre-defined special permissions for better performance
// Note: These are functions to get translations dynamically
const getSpecialPermissions = (): Permission[] => [
  {
    label: t('permissions.special.fullAccess'),
    value: PERMISSIONS.ALL,
    category: 'Special',
    description: t('permissions.special.fullAccessDescription')
  },
  {
    label: t('permissions.special.allRead'),
    value: PERMISSIONS.ALL_READ,
    category: 'Special',
    description: t('permissions.special.allReadDescription')
  },
  {
    label: t('permissions.special.allCreate'),
    value: PERMISSIONS.ALL_CREATE,
    category: 'Special',
    description: t('permissions.special.allCreateDescription')
  },
  {
    label: t('permissions.special.allUpdate'),
    value: PERMISSIONS.ALL_UPDATE,
    category: 'Special',
    description: t('permissions.special.allUpdateDescription')
  },
  {
    label: t('permissions.special.allDelete'),
    value: PERMISSIONS.ALL_DELETE,
    category: 'Special',
    description: t('permissions.special.allDeleteDescription')
  }
]



/**
 * Generate permissions for all collections dynamically
 * Optimized with functional programming and pre-computed constants
 */
export const generateCollectionPermissions = (
  collections: CollectionConfig[],
  customPermissions?: Array<{
    label: string
    value: string
    description?: string
  }>
): Permission[] => {
  // Use flatMap for more efficient array building
  const collectionPermissions = collections.flatMap(collection => {
    const collectionLabel = formatLabel(collection.slug)
    
    // Build all permissions for this collection in one array
    const basePermissions: Permission[] = [
      // Collection wildcard
      {
        label: t('permissions.collection.allOperations', { collection: collectionLabel }),
        value: `${collection.slug}.*`,
        category: collectionLabel,
        description: t('permissions.collection.allOperationsDescription', { collection: collectionLabel })
      },
      // CRUD permissions using map
      ...CRUD_OPERATIONS.map(operation => ({
        label: t('permissions.collection.operation', { operation: getOperationLabel(operation), collection: collectionLabel }),
        value: `${collection.slug}.${operation}`,
        category: collectionLabel,
        description: t('permissions.collection.operationDescription', { operation, collection: collectionLabel })
      })),
      // Manage permission
      {
        label: t('permissions.collection.manage', { collection: collectionLabel }),
        value: `${collection.slug}.manage`,
        category: collectionLabel,
        description: t('permissions.collection.manageDescription', { collection: collectionLabel })
      }
    ]

    // Add conditional permissions inline
    if (collection.versions) {
      basePermissions.push({
        label: t('permissions.collection.publish', { collection: collectionLabel }),
        value: `${collection.slug}.publish`,
        category: collectionLabel,
        description: t('permissions.collection.publishDescription', { collection: collectionLabel })
      })
    }



    return basePermissions
  })

  // Process custom permissions - extract and format namespace as category
  const processedCustomPermissions: Permission[] = customPermissions?.map(perm => {
    // Extract namespace from value (part before the dot)
    const namespace = perm.value.split('.')[0]
    const formattedCategory = namespace ? formatLabel(namespace) : undefined
    
    return {
      ...perm,
      category: formattedCategory
    }
  }) || []

  // Combine all permissions in a single return
  return [
    ...getSpecialPermissions(),
    ...collectionPermissions,
    ...processedCustomPermissions
  ]
}



/**
 * Get operation label
 */
const getOperationLabel = (operation: string): string => {
  const translationKey = `permissions.operations.${operation}` as const
  const translated = t(translationKey)
  // If translation not found, return the operation name
  return translated !== translationKey ? translated : operation
}
