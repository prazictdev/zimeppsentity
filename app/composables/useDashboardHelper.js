import { usePeClient } from './usePeClient';

export const useDashboardHelper = () => {
  const client = usePeClient();

  /**
   * Fetch the authenticated user's primary company plus their annual
   * procurement plan for the current calendar year.
   * Response shape: { company, year, plan, has_plan }
   */
  const getCompanyPlan = async () => {
    try {
      const data = await client('/api/v1/me/company-plan', { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  return { getCompanyPlan };
};
