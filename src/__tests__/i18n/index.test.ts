import { t, setLocale, getLocale, initI18n, DEFAULT_LOCALE } from '../../i18n'

describe('i18n', () => {
  beforeEach(() => {
    // Reset to default locale before each test
    initI18n('en')
  })

  describe('getLocale', () => {
    it('should return default locale initially', () => {
      expect(getLocale()).toBe('en')
    })

    it('should return the set locale', () => {
      setLocale('de')
      expect(getLocale()).toBe('de')
    })
  })

  describe('setLocale', () => {
    it('should set the locale to German', () => {
      setLocale('de')
      expect(getLocale()).toBe('de')
    })

    it('should fallback to English for invalid locale', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      // @ts-expect-error - testing invalid locale
      setLocale('invalid')
      expect(getLocale()).toBe('en')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Locale "invalid" not found')
      )
      consoleSpy.mockRestore()
    })
  })

  describe('initI18n', () => {
    it('should initialize with default locale', () => {
      initI18n()
      expect(getLocale()).toBe('en')
    })

    it('should initialize with German locale', () => {
      initI18n('de')
      expect(getLocale()).toBe('de')
    })
  })

  describe('t - translation function', () => {
    it('should translate English strings', () => {
      expect(t('components.protectedRoleNotice.title')).toBe('Protected System Role')
      expect(t('components.protectedRoleNotice.description')).toContain('protected system role')
    })

    it('should translate German strings when locale is set', () => {
      setLocale('de')
      expect(t('components.protectedRoleNotice.title')).toBe('Geschützte Systemrolle')
      expect(t('components.protectedRoleNotice.description')).toContain('geschützte Systemrolle')
    })

    it('should replace placeholders in translations', () => {
      expect(t('validation.cannotAssignRole', { roleLabel: 'Admin' })).toBe(
        "You don't have permission to assign the Admin role"
      )
    })

    it('should replace placeholders in German translations', () => {
      setLocale('de')
      expect(t('validation.cannotAssignRole', { roleLabel: 'Admin' })).toBe(
        'Du hast keine Berechtigung, die Rolle Admin zuzuweisen'
      )
    })

    it('should fallback to English if translation key not found', () => {
      setLocale('de')
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const result = t('nonexistent.key')
      expect(result).toBe('nonexistent.key')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should fallback to English if German translation missing', () => {
      setLocale('de')
      // Use a key that exists in English but might not exist in German
      const result = t('collections.roles.description')
      expect(result).toBeTruthy()
      expect(result).not.toBe('collections.roles.description')
    })

    it('should handle nested keys', () => {
      expect(t('collections.roles.fields.name.description')).toContain('Unique role identifier')
    })

    it('should handle numeric placeholders', () => {
      expect(t('messages.createdRole', { name: 'admin' })).toBe('✅ Created role: admin')
    })

    it('should return key if translation not found and no fallback', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const result = t('completely.nonexistent.key')
      expect(result).toBe('completely.nonexistent.key')
      consoleSpy.mockRestore()
    })
  })

  describe('DEFAULT_LOCALE', () => {
    it('should be "en"', () => {
      expect(DEFAULT_LOCALE).toBe('en')
    })
  })

  describe('permission translations', () => {
    it('should translate permission operations', () => {
      expect(t('permissions.operations.create')).toBe('Create')
      expect(t('permissions.operations.read')).toBe('Read')
      expect(t('permissions.operations.update')).toBe('Edit')
      expect(t('permissions.operations.delete')).toBe('Delete')
    })

    it('should translate permission operations in German', () => {
      setLocale('de')
      expect(t('permissions.operations.create')).toBe('Erstellen')
      expect(t('permissions.operations.read')).toBe('Lesen')
      expect(t('permissions.operations.update')).toBe('Bearbeiten')
      expect(t('permissions.operations.delete')).toBe('Löschen')
    })

    it('should translate special permissions', () => {
      expect(t('permissions.special.fullAccess')).toBe('⭐ Full Access (Super Admin)')
      expect(t('permissions.special.allRead')).toBe('📖 All Read Access')
    })
  })

  describe('collection field translations', () => {
    it('should translate role field descriptions', () => {
      expect(t('collections.roleField.description')).toContain('permissions and access rights')
    })

    it('should translate roles collection fields', () => {
      expect(t('collections.roles.fields.name.description')).toContain('Unique role identifier')
      expect(t('collections.roles.fields.label.description')).toContain('Display name')
      expect(t('collections.roles.fields.permissions.description')).toContain('Select permissions')
    })
  })

  describe('error message translations', () => {
    it('should translate validation errors', () => {
      expect(t('validation.roleNotFound')).toBe('Role not found')
      expect(t('validation.errorValidatingRole')).toBe('Error validating role assignment')
    })

    it('should translate role collection errors', () => {
      expect(t('collections.roles.errors.nameCannotChange')).toContain('name of a protected role')
      expect(t('collections.roles.errors.cannotRemoveSuperAdmin')).toContain('cannot remove super admin')
    })
  })

  describe('message translations', () => {
    it('should translate sync messages', () => {
      expect(t('messages.syncingRoles')).toBe('🔄 Syncing system roles...')
      expect(t('messages.roleSyncCompleted')).toBe('✅ Role sync completed')
    })

    it('should translate role creation messages', () => {
      expect(t('messages.createdRole', { name: 'admin' })).toBe('✅ Created role: admin')
      expect(t('messages.updatedRole', { name: 'editor' })).toBe('🔄 Updated role: editor')
    })
  })
})
