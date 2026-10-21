import { FamilyReportError, upsertFamilyReport } from '../../domain/family.js';
import { createId, toSafeText } from '../stateHelpers.js';

/**
 * Family budget: the partner's monthly spending, kept apart from the user's
 * own money. Nothing here touches accounts, totals or debts — these figures
 * only feed the report screen.
 */
export const createFamilyActions = (set) => ({
  /**
   * Stores a parsed report file. Creates the member on the first import and
   * replaces an existing month instead of adding a second copy of it.
   *
   * Refuses a file from a different install unless `acceptForeign` is set: the
   * UI asks the user first, because it usually means a new phone.
   */
  importFamilyReport: (file, options = {}) =>
    set((state) => {
      if (!file?.monthKey) return {};
      const existingMember = state.familyMember;
      const senderId = toSafeText(file.sender?.id, '');

      if (existingMember && senderId && existingMember.senderId && existingMember.senderId !== senderId) {
        if (!options.acceptForeign) {
          throw new FamilyReportError('other_device', 'Report comes from another device');
        }
      }

      const member = existingMember
        ? {
            ...existingMember,
            name: toSafeText(options.name, existingMember.name),
            senderId: senderId || existingMember.senderId,
            currency: file.currency || existingMember.currency,
          }
        : {
            id: createId(),
            name: toSafeText(
              options.name,
              toSafeText(file.sender?.name, state.language === 'en' ? 'Partner' : 'Партнёр'),
            ),
            senderId,
            currency: file.currency,
            addedAt: new Date().toISOString(),
          };

      return {
        familyMember: member,
        familyReports: upsertFamilyReport(state.familyReports, {
          monthKey: file.monthKey,
          currency: file.currency,
          expensesTotal: file.expensesTotal,
          categories: file.categories,
          exportedAt: file.exportedAt,
          importedAt: new Date().toISOString(),
        }),
      };
    }),
  renameFamilyMember: (name) =>
    set((state) => {
      const safeName = toSafeText(name, '');
      if (!state.familyMember || !safeName || safeName === state.familyMember.name) return {};
      return { familyMember: { ...state.familyMember, name: safeName } };
    }),
  removeFamilyReport: (monthKey) =>
    set((state) => {
      if (!state.familyReports.some((item) => item.monthKey === monthKey)) return {};
      return { familyReports: state.familyReports.filter((item) => item.monthKey !== monthKey) };
    }),
  removeFamilyMember: () => set({ familyMember: null, familyReports: [] }),
  /** The name this device signs its own outgoing reports with. */
  setFamilySenderName: (name) => set({ familySenderName: toSafeText(name, '') }),
});
