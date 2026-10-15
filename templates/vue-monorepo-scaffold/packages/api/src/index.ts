import axios, { AxiosError, type AxiosInstance } from 'axios'

/**
 * 请求层：超时 + 错误分级 + 弱网重试。
 * 重试语义（提炼自前端沉淀库的弱网任务队列方案）：
 * - 只有网络层失败（无响应）与 5xx/429 可重试；4xx（鉴权/参数）重试无意义，直接抛出
 * - 指数退避：baseDelay × 2^attempt（800ms → 1600ms）
 * - 每次重试前检查 signal.aborted，取消可穿透退避等待
 */
const RETRYABLE = { maxRetries: 2, baseDelay: 800 }

export interface RequestHooks {
  /** 请求头注入（token 等） */
  onRequest?: (config: Record<string, unknown>) => Record<string, unknown>
  /** 业务错误统一提示（401 跳登录等） */
  onError?: (err: ApiError) => void
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string | number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function isRetryable(err: AxiosError): boolean {
  if (!err.response) return true // 无响应 = 网络层失败（断网/超时/DNS）
  return err.response.status === 429 || err.response.status >= 500
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('aborted', 'AbortError'))
    })
  })

/** 供宿主应用自检包是否正常接入 */
export function healthCheck(): string {
  return '@scaffold/api ok'
}

export function createRequest(baseURL: string, hooks: RequestHooks = {}): AxiosInstance {  const instance = axios.create({ baseURL, timeout: 15_000 })

  instance.interceptors.request.use((config) => {
    if (hooks.onRequest) Object.assign(config, hooks.onRequest({ ...config }))
    return config
  })

  instance.interceptors.response.use(
    (res) => res.data,
    async (error: AxiosError) => {
      const config = error.config as (typeof error.config & { __retries?: number }) | undefined
      const attempt = config?.__retries ?? 0
      if (config && isRetryable(error) && attempt < RETRYABLE.maxRetries) {
        config.__retries = attempt + 1
        await sleep(RETRYABLE.baseDelay * 2 ** attempt, config.signal as AbortSignal | undefined)
        return instance.request(config)
      }
      const apiError =
        error.response
          ? new ApiError(
              (error.response.data as { message?: string })?.message ?? `请求失败（${error.response.status}）`,
              error.response.status,
              undefined,
              error.response.data
            )
          : new ApiError('网络异常，请检查连接后重试')
      hooks.onError?.(apiError)
      throw apiError
    }
  )

  return instance
}
