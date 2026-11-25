import { usePeClient } from './usePeClient'

export const useProjectHelper = () => {
  const client = usePeClient()
  const call = async (url, options = {}) => {
    try { return { data: ref(await client(url, options)), status: ref(true), error: ref(null) } }
    catch (error) { return { data: ref(null), status: ref(false), error: ref(error) } }
  }
  return {
    getProjects: () => call('/api/v1/me/projects'),
    getProjectOptions: () => call('/api/v1/me/projects/options'),
    getProject: uuid => call(`/api/v1/me/projects/${uuid}`),
    createProject: body => call('/api/v1/me/projects', { method: 'POST', body }),
    updateProject: (uuid, body) => call(`/api/v1/me/projects/${uuid}`, { method: 'PUT', body }),
    archiveProject: uuid => call(`/api/v1/me/projects/${uuid}`, { method: 'DELETE' }),
    createMilestone: (uuid, body) => call(`/api/v1/me/projects/${uuid}/milestones`, { method: 'POST', body }),
    updateMilestone: (uuid, milestoneUuid, body) => call(`/api/v1/me/projects/${uuid}/milestones/${milestoneUuid}`, { method: 'PUT', body }),
    deleteMilestone: (uuid, milestoneUuid) => call(`/api/v1/me/projects/${uuid}/milestones/${milestoneUuid}`, { method: 'DELETE' }),
  }
}
