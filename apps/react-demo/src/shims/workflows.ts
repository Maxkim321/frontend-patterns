/** workflowApi 演示版：DocFlow 原实现走后端，这里本地回显，保证「保存」交互可用 */
export const workflowApi = {
  async updateWorkflow(_id: string, payload: { name: string }) {
    return { data: { data: { ...payload } }, error: null as string | null }
  },
}
