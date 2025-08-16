interface JaggaerConfig {
  baseUrl: string
  clientId: string
  clientSecret: string
}

interface TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

interface CompanyProfile {
  bravoId?: string
  companyCode?: string
  companyName?: string
  companyMaster?: any
  companyDEBasic?: any
  deBasic?: any
  LASTMODTIME?: string
}

interface CompanyInfo {
  bravo_id: string | null
  ext_code?: string
  company_name: string
  fiscal_code?: string
  eu_vat?: string
  email?: string
  pec_email?: string
  phone?: string
  address?: string
  zip?: string
  city?: string
  province?: string
  country?: string
  status: string
  type: string
  registration_date?: Date
  last_mod_time?: Date
}

interface Certification {
  type: string
  name: string
  raw_type?: string
  values: {
    de_name?: string
    de_label?: string
    filename?: string
    file_id?: string
    secure_token?: string
    restricted: boolean
    attachment_expiry_date?: string
    last_answer_date?: string
    last_confirmed_date?: string
    last_answer_user_id?: string
    last_answer_user_name?: string
  }
}

interface JaggaerSupplierResponse {
  returnCompanyInfo: {
    bravoId: string
    companyName: string
    bizLegalStruct?: string
    fiscalCode?: string
    euVat?: string
    bizEmail?: string
    userPecEmails?: string
    bizPhone?: string
    address?: string
    zip?: string
    city?: string
    province?: string
    isoCountry?: string
    status: string
    currency?: string
    extCode?: string
    userAlias?: string
    userSurName?: string
    userName?: string
    userEmail?: string
    userPhone?: string
    userRole?: string
    registrationDate?: string
    lastModTime?: string
    type: string
    [key: string]: any
  }
  deBasic: {
    deInfo: Array<{
      name: string
      type: string
      values: {
        value: Array<{
          deValue: string
          id?: string
          secureToken?: string
          restricted: string
        }>
      }
      defaultLabel?: string
      defaultLabelLocale?: string
      attachmentExpiryDate?: string
      attachmentExpiryDateManagedBy?: string
      attachmentExpiryDateLastUpdateUser?: {
        id: number
        name: string
        company: {
          id: number
          code?: string
          name: string
        }
      }
      attachmentExpiryDateLastUpdateDate?: string
      lastAnswerDate?: string
      lastAnswerUser?: {
        id: number
        name: string
        company: {
          id: number
          code?: string
          name: string
        }
      }
      lastConfirmedDate?: string
    }>
  }
}

interface EnhancedCertification {
  type: string
  name: string
  raw_type?: string
  question_code: string
  values: {
    de_name: string
    de_label?: string
    filename?: string
    file_id?: string
    secure_token?: string
    restricted: boolean
    attachment_expiry_date?: string
    last_answer_date?: string
    last_confirmed_date?: string
    last_answer_user_id?: number
    last_answer_user_name?: string
    last_answer_company_id?: number
    last_answer_company_name?: string
    expiry_managed_by?: string
    expiry_last_update_date?: string
  }
}

interface EnhancedCompanyInfo extends CompanyInfo {
  biz_legal_struct?: string
  user_alias?: string
  user_surname?: string
  user_name?: string
  user_email?: string
  user_phone?: string
  user_role?: string
  currency?: string
  locale?: string
  timezone?: string
  user_id?: number
  user_division_id?: number
  user_login_count?: number
  user_last_login_date?: string
  company_bvd_id?: string
  registration_date_time?: Date
  user_last_login_date_time?: Date
}

export class JaggaerAPIClient {
  private config: JaggaerConfig
  private accessToken: string | null = null
  private tokenExpiresAt: number | null = null

  constructor(config: JaggaerConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/$/, ""), // Remove trailing slash
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now() / 1000

    if (this.accessToken && this.tokenExpiresAt && now < this.tokenExpiresAt) {
      return this.accessToken
    }

    const tokenUrl = `${this.config.baseUrl}/auth/realms/J1p-integrations/protocol/openid-connect/token`

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "client_credentials",
      }),
    })

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status} ${response.statusText}`)
    }

    const tokenData: TokenResponse = await response.json()
    this.accessToken = tokenData.access_token
    this.tokenExpiresAt = now + tokenData.expires_in - 30 // 30 second buffer

    return this.accessToken
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}, maxRetries = 3): Promise<any> {
    const url = `${this.config.baseUrl}/j1p/api/public/ja/v1/${endpoint.replace(/^\//, "")}`

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = await this.getAccessToken()
        const searchParams = new URLSearchParams(params)
        const fullUrl = `${url}?${searchParams}`

        const response = await fetch(fullUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        })

        if (response.status === 401) {
          // Token expired, clear it and retry
          this.accessToken = null
          await new Promise((resolve) => setTimeout(resolve, 1000))
          continue
        }

        if (response.status === 429) {
          // Rate limited
          const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "15")
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
          continue
        }

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        if (data.returnCode && data.returnCode !== "0" && data.returnCode !== 0) {
          console.warn(`API returned non-zero code: ${data.returnMessage}`)
        }

        return data
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error)
        if (attempt === maxRetries - 1) {
          throw error
        }
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }

  async getCompanyProfiles(
    options: {
      components?: string[]
      filters?: Record<string, string>
      lastModTime?: string
      start?: number
    } = {},
  ): Promise<any> {
    const params: Record<string, string> = {
      start: String(options.start || 1),
    }

    if (options.components?.length) {
      params.comp = options.components.join(";")
    }

    const filterConditions: string[] = []
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        filterConditions.push(`${key}==${value}`)
      }
    }

    if (options.lastModTime) {
      filterConditions.push(`LASTMODTIME>=${options.lastModTime}`)
    }

    if (filterConditions.length > 0) {
      params.flt = filterConditions.join(";")
    }

    return this.makeRequest("companyprofiles", params)
  }

  async getAllCompanyProfiles(
    options: {
      components?: string[]
      filters?: Record<string, string>
      lastModTime?: string
      batchSize?: number
      maxTotal?: number
    } = {},
  ): Promise<CompanyProfile[]> {
    const allProfiles: CompanyProfile[] = []
    const batchSize = options.batchSize || 100
    let start = 1

    while (true) {
      const response = await this.getCompanyProfiles({
        ...options,
        start,
      })

      const profiles = response.returnCompanyData || []
      const totalRecords = Number.parseInt(response.totRecords || "0")
      const returnedRecords = Number.parseInt(response.returnedRecords || profiles.length.toString())

      if (!profiles.length) {
        break
      }

      if (options.maxTotal && options.maxTotal > 0) {
        const remaining = options.maxTotal - allProfiles.length
        if (remaining <= 0) break
        allProfiles.push(...profiles.slice(0, remaining))
      } else {
        allProfiles.push(...profiles)
      }

      console.log(`Fetched ${allProfiles.length}/${totalRecords} profiles (this page: ${returnedRecords})`)

      if (
        allProfiles.length >= totalRecords ||
        returnedRecords < batchSize ||
        (options.maxTotal && allProfiles.length >= options.maxTotal)
      ) {
        break
      }

      start += returnedRecords
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Rate limiting
    }

    return allProfiles
  }

  private parseDate(value: any): Date | null {
    if (!value) return null

    if (value instanceof Date) return value

    const str = String(value).trim()

    // YYYYMMDD format
    if (str.length === 8 && /^\d{8}$/.test(str)) {
      const year = Number.parseInt(str.substring(0, 4))
      const month = Number.parseInt(str.substring(4, 6)) - 1 // Month is 0-indexed
      const day = Number.parseInt(str.substring(6, 8))
      return new Date(year, month, day)
    }

    // YYYYMMDDHHMMSS format
    if (str.length === 14 && /^\d{14}$/.test(str)) {
      const year = Number.parseInt(str.substring(0, 4))
      const month = Number.parseInt(str.substring(4, 6)) - 1
      const day = Number.parseInt(str.substring(6, 8))
      const hour = Number.parseInt(str.substring(8, 10))
      const minute = Number.parseInt(str.substring(10, 12))
      const second = Number.parseInt(str.substring(12, 14))
      return new Date(year, month, day, hour, minute, second)
    }

    // ISO format
    try {
      return new Date(str.replace("Z", "+00:00"))
    } catch {
      return null
    }
  }

  extractCompanyInfo(profile: JaggaerSupplierResponse | CompanyProfile): EnhancedCompanyInfo {
    const master =
      (profile as JaggaerSupplierResponse).returnCompanyInfo ||
      (profile as CompanyProfile).companyMaster ||
      (profile as CompanyProfile).returnCompanyInfo ||
      {}

    const debasic = (profile as CompanyProfile).companyDEBasic || (profile as CompanyProfile).deBasic || {}

    // Extract all company information fields
    const bravoId = master.bravoId || master.companyId || master.id || (profile as CompanyProfile).bravoId
    const extCode = master.extCode || master.companyCode || (profile as CompanyProfile).companyCode
    const companyName =
      master.companyName || master.name || master.bizName || (profile as CompanyProfile).companyName || ""

    // Enhanced field extraction
    const bizLegalStruct = master.bizLegalStruct
    const fiscalCode = master.fiscalCode || debasic.taxCode || master.taxCode
    const euVat = master.euVat || debasic.vatNumber || master.vatNumber
    const bizEmail = master.bizEmail || debasic.email || master.email
    const userPecEmails = master.userPecEmails || debasic.pecEmail || master.pecEmail
    const bizPhone = master.bizPhone || debasic.phone || master.phone

    // Address information
    const address = master.address || debasic.address
    const zip = master.zip || debasic.zip || debasic.zipCode
    const city = master.city || debasic.city
    const province = master.province || debasic.province
    const isoCountry = master.isoCountry || debasic.country || master.country

    // User information
    const userAlias = master.userAlias
    const userSurName = master.userSurName
    const userName = master.userName
    const userEmail = master.userEmail
    const userPhone = master.userPhone
    const userRole = master.userRole

    // System information
    const currency = master.currency
    const locale = master.locale
    const timezone = master.timezone
    const userId = master.userId
    const userDivisionId = master.userDivisionId
    const userLoginCount = master.userLoginCount
    const userLastLoginDate = master.userLastLoginDate
    const companyBvdId = master.companyBvdId

    // Status and type
    let status = master.status || (profile as CompanyProfile).status || "ACTIVE"
    if (typeof status === "string") {
      status = status.toUpperCase() === "ABILITATO" || status.toUpperCase() === "ACTIVE" ? "ACTIVE" : status
    }
    const supplierType = master.type || (profile as CompanyProfile).type || "SELLER"

    // Enhanced date parsing
    const registrationDate = this.parseDate(master.registrationDate || debasic.registrationDate)
    const registrationDateTime = this.parseDate(master.registrationDateTime)
    const lastModTime = this.parseDate(master.lastModTime || (profile as CompanyProfile).LASTMODTIME)
    const userLastLoginDateTime = this.parseDate(master.userLastLoginDateTime)

    return {
      bravo_id: bravoId ? String(bravoId) : null,
      ext_code: extCode,
      company_name: companyName,
      biz_legal_struct: bizLegalStruct,
      fiscal_code: fiscalCode,
      eu_vat: euVat,
      email: bizEmail,
      pec_email: userPecEmails,
      phone: bizPhone,
      address,
      zip,
      city,
      province,
      country: isoCountry,
      status,
      type: supplierType,
      user_alias: userAlias,
      user_surname: userSurName,
      user_name: userName,
      user_email: userEmail,
      user_phone: userPhone,
      user_role: userRole,
      currency,
      locale,
      timezone,
      user_id: userId,
      user_division_id: userDivisionId,
      user_login_count: userLoginCount,
      user_last_login_date: userLastLoginDate,
      company_bvd_id: companyBvdId,
      registration_date: registrationDate,
      registration_date_time: registrationDateTime,
      last_mod_time: lastModTime,
      user_last_login_date_time: userLastLoginDateTime,
    }
  }

  extractCertifications(profile: JaggaerSupplierResponse | CompanyProfile): EnhancedCertification[] {
    const certifications: EnhancedCertification[] = []

    try {
      const deInfo =
        (profile as JaggaerSupplierResponse).deBasic?.deInfo ||
        (profile as CompanyProfile).deBasic?.deInfo ||
        (profile as CompanyProfile).companyDEBasic?.deInfo ||
        []

      // Enhanced certification type mapping
      const qcodeToType: Record<string, string> = {
        Q1_ALLEGATO_SOA: "SOA",
        Q1_ALLEGATO_ISO_9001: "ISO_9001",
        Q1_ALLEGATO_ISO_14001: "ISO_14001",
        Q1_ALLEGATO_ISO_37001: "ISO_37001",
        Q1_ALLEGATO_ISO_39001: "ISO_39001",
        Q1_ALLEGATO_ISO_45001: "ISO_45001",
        Q1_ALLEGATO_SA_8000: "SA_8000",
        Q1_CCIAA_ALLEGATO: "CCIAA",
        Q0_DURC_ALLEGATO: "DURC",
        Q0_ASSICURAZIONE_ALLEGATO: "INSURANCE",
        Q0_LEGALE_RAPPRESENTANTE_DOCUMENTO: "LEGAL_REP_ID",
        INFO_WHITELIST_ALLEGATO: "WHITE_LIST",
        Q0_ALBO_AUTOTRASPORTATORI_ALLEGATO: "TRANSPORT_REGISTRY",
        Q0_ALBO_AMBIENTALI_ALLEGATO: "ENVIRONMENTAL_REGISTRY",
      }

      for (const item of deInfo) {
        if (String(item.type) !== "4") continue // Only attachments

        const qcode = item.name
        const label = item.defaultLabel || qcode || ""
        const lastAnswerDate = item.lastAnswerDate
        const lastConfirmedDate = item.lastConfirmedDate
        const attachmentExpiryDate = item.attachmentExpiryDate
        const lastAnswerUser = item.lastAnswerUser || {}
        const expiryUpdateUser = item.attachmentExpiryDateLastUpdateUser || {}

        // Determine certification type with enhanced mapping
        let certType = qcodeToType[qcode]
        if (!certType && qcode) {
          const combined = `${qcode} ${label}`.toUpperCase()
          if (combined.includes("ISO 9001")) certType = "ISO_9001"
          else if (combined.includes("ISO 14001")) certType = "ISO_14001"
          else if (combined.includes("ISO 37001")) certType = "ISO_37001"
          else if (combined.includes("ISO 39001")) certType = "ISO_39001"
          else if (combined.includes("ISO 45001")) certType = "ISO_45001"
          else if (combined.includes("SA 8000")) certType = "SA_8000"
          else if (combined.includes("SOA")) certType = "SOA"
          else if (combined.includes("DURC")) certType = "DURC"
          else if (combined.includes("WHITE")) certType = "WHITE_LIST"
          else if (combined.includes("CCIAA") || combined.includes("CAMERA")) certType = "CCIAA"
          else if (combined.includes("ASSICUR")) certType = "INSURANCE"
          else certType = "OTHER"
        }

        const values = item.values?.value || []
        for (const v of values) {
          const filename = v.deValue
          const fileId = v.id
          const secureToken = v.secureToken
          const restricted = String(v.restricted) === "1"

          certifications.push({
            type: certType || "OTHER",
            name: label || filename || qcode || "Attachment",
            raw_type: item.type ? String(item.type) : undefined,
            question_code: qcode,
            values: {
              de_name: qcode,
              de_label: label,
              filename,
              file_id: fileId,
              secure_token: secureToken,
              restricted,
              attachment_expiry_date: attachmentExpiryDate,
              last_answer_date: lastAnswerDate,
              last_confirmed_date: lastConfirmedDate,
              last_answer_user_id: lastAnswerUser.id,
              last_answer_user_name: lastAnswerUser.name,
              last_answer_company_id: lastAnswerUser.company?.id,
              last_answer_company_name: lastAnswerUser.company?.name,
              expiry_managed_by: item.attachmentExpiryDateManagedBy,
              expiry_last_update_date: item.attachmentExpiryDateLastUpdateDate,
            },
          })
        }
      }
    } catch (error) {
      console.warn("Failed to parse certifications:", error)
    }

    return certifications
  }

  extractDebasicAnswers(profile: JaggaerSupplierResponse | CompanyProfile): Record<string, any> {
    const answers: Record<string, any> = {}

    try {
      const deInfo =
        (profile as JaggaerSupplierResponse).deBasic?.deInfo ||
        (profile as CompanyProfile).deBasic?.deInfo ||
        (profile as CompanyProfile).companyDEBasic?.deInfo ||
        []

      for (const item of deInfo) {
        const qcode = item.name
        if (!qcode) continue

        const values = item.values?.value || []
        if (!values.length) continue

        // Store complete item information
        const itemData = {
          type: item.type,
          label: item.defaultLabel,
          locale: item.defaultLabelLocale,
          values: values.map((v) => ({
            value: v.deValue,
            id: v.id,
            secure_token: v.secureToken,
            restricted: v.restricted === "1",
          })),
          attachment_expiry_date: item.attachmentExpiryDate,
          expiry_managed_by: item.attachmentExpiryDateManagedBy,
          last_answer_date: item.lastAnswerDate,
          last_confirmed_date: item.lastConfirmedDate,
          last_answer_user: item.lastAnswerUser,
          expiry_update_user: item.attachmentExpiryDateLastUpdateUser,
          expiry_update_date: item.attachmentExpiryDateLastUpdateDate,
        }

        // Store simplified value for backward compatibility
        if (values.length > 1) {
          answers[qcode] = values.map((v) => v.deValue || "N/A")
        } else {
          answers[qcode] = values[0].deValue || "N/A"
        }

        // Store complete data with _FULL suffix
        answers[`${qcode}_FULL`] = itemData
      }
    } catch (error) {
      console.warn("Failed to extract debasic answers:", error)
    }

    return answers
  }

  calculateComplianceStatus(certifications: EnhancedCertification[]): {
    overall_status: "GREEN" | "YELLOW" | "RED"
    compliance_score: number
    required_certs: Record<
      string,
      {
        status: "VALID" | "EXPIRING" | "EXPIRED" | "MISSING"
        expiry_date?: string
        days_until_expiry?: number
      }
    >
  } {
    const requiredCertTypes = ["SOA", "DURC", "ISO_9001", "WHITE_LIST", "CCIAA", "INSURANCE"]
    const requiredCerts: Record<string, any> = {}
    let validCount = 0
    let expiringCount = 0
    let expiredCount = 0

    const now = new Date()

    for (const certType of requiredCertTypes) {
      const cert = certifications.find((c) => c.type === certType)

      if (!cert) {
        requiredCerts[certType] = { status: "MISSING" }
        continue
      }

      const expiryDate = cert.values.attachment_expiry_date
      if (!expiryDate) {
        requiredCerts[certType] = { status: "VALID" }
        validCount++
        continue
      }

      const expiry = new Date(expiryDate)
      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiry < 0) {
        requiredCerts[certType] = {
          status: "EXPIRED",
          expiry_date: expiryDate,
          days_until_expiry: daysUntilExpiry,
        }
        expiredCount++
      } else if (daysUntilExpiry <= 30) {
        requiredCerts[certType] = {
          status: "EXPIRING",
          expiry_date: expiryDate,
          days_until_expiry: daysUntilExpiry,
        }
        expiringCount++
      } else {
        requiredCerts[certType] = {
          status: "VALID",
          expiry_date: expiryDate,
          days_until_expiry: daysUntilExpiry,
        }
        validCount++
      }
    }

    const totalRequired = requiredCertTypes.length
    const complianceScore = Math.round((validCount / totalRequired) * 100)

    let overallStatus: "GREEN" | "YELLOW" | "RED"
    if (expiredCount > 0 || complianceScore < 70) {
      overallStatus = "RED"
    } else if (expiringCount > 0 || complianceScore < 90) {
      overallStatus = "YELLOW"
    } else {
      overallStatus = "GREEN"
    }

    return {
      overall_status: overallStatus,
      compliance_score: complianceScore,
      required_certs: requiredCerts,
    }
  }
}

export class JaggaerAttachmentClient {
  private apiClient: JaggaerAPIClient
  private baseUrl: string
  private rateLimitDelay: number
  private maxRetries: number

  constructor(config: JaggaerConfig, options: { rateLimitDelay?: number; maxRetries?: number } = {}) {
    this.apiClient = new JaggaerAPIClient(config)
    this.baseUrl = config.baseUrl.replace(/\/$/, "")
    this.rateLimitDelay = options.rateLimitDelay ?? 1000 // 1 second default
    this.maxRetries = options.maxRetries ?? 3
  }

  private maskToken(token: string, head = 4, tail = 4): string {
    if (!token) return ""
    if (token.length <= head + tail) return "*".repeat(token.length)
    return `${token.slice(0, head)}...${token.slice(-tail)}`
  }

  private getExtensionFromContentType(contentType: string): string {
    const mapping: Record<string, string> = {
      "application/pdf": ".pdf",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
      "application/vnd.ms-powerpoint": ".ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
      "text/plain": ".txt",
      "text/csv": ".csv",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "application/zip": ".zip",
      "application/json": ".json",
      "application/xml": ".xml",
    }
    return mapping[contentType?.toLowerCase()] || ".bin"
  }

  private resolveFilename(
    response: Response,
    providedFilename?: string,
    params?: Record<string, string>
  ): string {
    let filename = providedFilename

    if (!filename) {
      const contentDisposition = response.headers.get("Content-Disposition") || ""
      
      // Try filename*= first (RFC 5987 encoded)
      if (contentDisposition.includes("filename*=")) {
        try {
          const fnStar = contentDisposition.split("filename*=")[1].split(";")[0].trim()
          if (fnStar.toLowerCase().startsWith("utf-8''")) {
            filename = decodeURIComponent(fnStar.slice(7).replace(/^["']|["']$/g, ""))
          }
        } catch (e) {
          // ignore parsing errors
        }
      }

      // Fallback to filename=
      if (!filename && contentDisposition.includes("filename=")) {
        filename = contentDisposition.split("filename=")[1].split(";")[0].replace(/^["']|["']$/g, "").trim()
      }

      // Try from params
      if (!filename && params?.fileName) {
        filename = params.fileName
      }

      // Generate fallback filename
      if (!filename) {
        const contentType = response.headers.get("Content-Type") || "application/octet-stream"
        const ext = this.getExtensionFromContentType(contentType)
        const timestamp = Date.now()
        filename = `attachment_${timestamp}${ext}`
      }
    }

    return filename
  }

  private async makeDownloadRequest(
    params: Record<string, string>,
    providedFilename?: string
  ): Promise<Blob> {
    const url = `${this.baseUrl}/j1p/api/public/ja/v1/attachments`
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Rate limiting with exponential backoff
        if (attempt > 0) {
          const delay = this.rateLimitDelay * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        const token = await (this.apiClient as any).getAccessToken()
        const searchParams = new URLSearchParams(params)

        // Log request with masked tokens
        const safeParams = { ...params }
        if (safeParams.secureToken) {
          safeParams.secureToken = this.maskToken(safeParams.secureToken)
        }
        console.log(`GET ${url} params=${JSON.stringify(safeParams)}`)

        const response = await fetch(`${url}?${searchParams}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "*/*",
          },
        })

        // Handle 401 - token might be expired, retry will get fresh token
        if (response.status === 401) {
          console.warn(`Attempt ${attempt + 1}: 401 Unauthorized, will retry with fresh token`)
          continue
        }

        if (!response.ok) {
          let errorBody = ""
          try {
            const contentType = response.headers.get("Content-Type") || ""
            if (contentType.includes("application/json")) {
              errorBody = JSON.stringify(await response.json())
            } else {
              errorBody = (await response.text()).slice(0, 1000)
            }
          } catch (e) {
            // ignore body parsing errors
          }
          
          throw new Error(
            `Download failed: ${response.status} ${response.statusText}. Body: ${errorBody}`
          )
        }

        // Log response info
        const contentType = response.headers.get("Content-Type") || "application/octet-stream"
        const contentLength = response.headers.get("Content-Length")
        console.log(`Content-Type: ${contentType}; Length: ${contentLength || "unknown"}`)

        return response.blob()

      } catch (error) {
        lastError = error as Error
        console.warn(`Attempt ${attempt + 1} failed:`, error)
        
        if (attempt === this.maxRetries - 1) {
          throw new Error(`All download attempts failed. Last error: ${lastError?.message}`)
        }
      }
    }

    throw new Error(`All download attempts failed. Last error: ${lastError?.message}`)
  }

  // Spec-preferred method
  async downloadBySecureToken(secureToken: string, filename?: string): Promise<Blob> {
    return this.makeDownloadRequest({ secureToken }, filename)
  }

  // Spec fallback method
  async downloadByFileId(fileId: string | number, fileName: string): Promise<Blob> {
    return this.makeDownloadRequest(
      { 
        fileId: String(fileId), 
        fileName: fileName 
      }, 
      fileName
    )
  }

  // Smart wrapper: try secureToken first, then fileId+fileName if provided
  async downloadRobust(
    secureToken?: string,
    fileId?: string | number,
    fileName?: string
  ): Promise<Blob> {
    let lastError: Error | null = null

    // Try secureToken first (preferred by spec)
    if (secureToken) {
      try {
        return await this.downloadBySecureToken(secureToken, fileName)
      } catch (error) {
        lastError = error as Error
        console.warn(`secureToken variant failed for ${fileName}:`, error)
      }
    }

    // Fallback to fileId+fileName
    if (fileId && fileName) {
      try {
        return await this.downloadByFileId(fileId, fileName)
      } catch (error) {
        lastError = error as Error
        console.warn(`fileId+fileName variant failed for ${fileName}:`, error)
      }
    }

    throw new Error(`All download variants failed for ${fileName}: ${lastError?.message}`)
  }
}

export class JaggaerClient {
  private apiClient: JaggaerAPIClient
  private attachmentClient: JaggaerAttachmentClient

  constructor() {
    const config: JaggaerConfig = {
      baseUrl: process.env.JAGGAER_BASE_URL || "",
      clientId: process.env.JAGGAER_CLIENT_ID || "",
      clientSecret: process.env.JAGGAER_CLIENT_SECRET || "",
    }

    this.apiClient = new JaggaerAPIClient(config)
    this.attachmentClient = new JaggaerAttachmentClient(config)
  }

  async fetchCompanyProfiles(limit?: number): Promise<any[]> {
    try {
      const options = {
        components: ["returnCompanyInfo", "deBasic"],
        maxTotal: limit || undefined,
        batchSize: 50,
      }

      const profiles = await this.apiClient.getAllCompanyProfiles(options)

      // Transform profiles to match database structure
      return profiles.map((profile) => {
        const companyInfo = this.apiClient.extractCompanyInfo(profile)
        const certifications = this.apiClient.extractCertifications(profile)
        const complianceStatus = this.apiClient.calculateComplianceStatus(certifications)

        return {
          bravo_id: companyInfo.bravo_id,
          ext_code: companyInfo.ext_code,
          company_name: companyInfo.company_name,
          fiscal_code: companyInfo.fiscal_code,
          vat_number: companyInfo.eu_vat,
          email: companyInfo.email,
          pec_email: companyInfo.pec_email,
          phone: companyInfo.phone,
          address: companyInfo.address,
          city: companyInfo.city,
          province: companyInfo.province,
          zip_code: companyInfo.zip,
          country: companyInfo.country,
          status: companyInfo.status,
          supplier_type: companyInfo.type,
          registration_date: companyInfo.registration_date?.toISOString(),
          jaggaer_last_mod_time: companyInfo.last_mod_time?.toISOString(),
          last_sync: new Date().toISOString(),
          verification_status: this.mapComplianceToVerificationStatus(complianceStatus.overall_status),
          certifications: certifications.map((cert) => ({
            certification_type: cert.type,
            certification_name: cert.name,
            status: cert.values.attachment_expiry_date ? "ACTIVE" : "PENDING",
            expiry_date: cert.values.attachment_expiry_date,
            values: [cert.values.de_name || cert.name],
          })),
        }
      })
    } catch (error) {
      console.error("Error fetching company profiles:", error)
      throw error
    }
  }

  private mapComplianceToVerificationStatus(complianceStatus: string): string {
    switch (complianceStatus) {
      case "GREEN":
        return "QUALIFIED"
      case "YELLOW":
        return "IN_PROGRESS"
      case "RED":
        return "PENDING"
      default:
        return "PENDING"
    }
  }

  async downloadAttachment(secureToken: string, filename?: string): Promise<Blob> {
    return this.attachmentClient.downloadBySecureToken(secureToken, filename)
  }

  async downloadAttachmentById(fileId: string | number, fileName: string): Promise<Blob> {
    return this.attachmentClient.downloadByFileId(fileId, fileName)
  }
}
