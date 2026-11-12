# NASA DONKI API Notes — Verified Field Names & Rate Limits

Verified live via `@Parallel` (`web_search` and `web_fetch`) against the official NASA Open APIs and CCMC DONKI OpenAPI 3.0 specification on 11 Nov 2026.

---

## 1. Rate Limits & Quotas (`api.nasa.gov`)

| Key Type | Hourly Limit | Daily Limit | Response Headers | Notes |
|---|---|---|---|---|
| Registered `NASA_API_KEY` | **1,000 requests / hour** | Rolling hourly cap | `X-RateLimit-Limit`, `X-RateLimit-Remaining` | Shared across all `api.nasa.gov` endpoints per API key. Exceeding blocks the key for 1 hour. |
| `DEMO_KEY` | **30 requests / IP / hour** | **50 requests / IP / day** | `X-RateLimit-Limit`, `X-RateLimit-Remaining` | For initial testing only; never use in production without caching and snapshot fallbacks. |

### Query Window Limits
- `https://api.nasa.gov/DONKI/FLR` and `https://api.nasa.gov/DONKI/CME`: `startDate` defaults to 30 days prior to current UTC date; `endDate` defaults to current UTC date (`yyyy-MM-dd`).
- CCMC OpenAPI 3.0 (`https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR`, `/get/CME`): enforces a **maximum 60-day window** per request (`400 Bad Request` if range exceeds 60 days).

---

## 2. Solar Flare (`GET /DONKI/FLR`) — `FLRObject` Schema

### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `startDate` | `string` (`yyyy-MM-dd`) | 30 days ago | Start date in UTC |
| `endDate` | `string` (`yyyy-MM-dd`) | Today (UTC) | End date in UTC |
| `catalog` | `string` | `"M2M_CATALOG"` | Catalog filter (`M2M_CATALOG`, `ALL`) |
| `class` | `string` | `"ALL"` | Flare class filter (`ALL`, `M`, `X`) |
| `api_key` | `string` | — | Server-side `NASA_API_KEY` |

### Exact JSON Response Fields (`FLRObject`)
| Field Name | JSON Type | Example | Game Mapping (`donkiMapper.js`) |
|---|---|---|---|
| `flrID` | `string` | `"2024-05-10T06:27:00-FLR-001"` | Unique event key (`event_key` in `donki_cache`, `id` in game timeline) |
| `catalog` | `string` | `"M2M_CATALOG"` | Source metadata |
| `instruments` | `Array<{ displayName: string }>` | `[{"displayName": "GOES-P: EXIS 1.0-8.0"}]` | Science flavour text |
| `beginTime` | `string` (ISO UTC) | `"2024-05-10T06:27Z"` | Compressed onto the level's Sol timeline (`solOffset`) |
| `peakTime` | `string \| null` | `"2024-05-10T06:54Z"` | Peak intensity timestamp |
| `endTime` | `string \| null` | `"2024-05-10T07:06Z"` | Event duration reference |
| `classType` | `string` | `"X3.9"`, `"M5.2"`, `"C4.1"` | Prefix `C` → `minor`, `M` → `major`, `X` → `extreme` severity |
| `sourceLocation` | `string` | `"N18W42"` | Alert flavour text (heliographic coordinates) |
| `activeRegionNum` | `integer \| null` | `13664` | Alert flavour text (`"AR 13664"`) |
| `note` | `string` | `"Associated with halo CME..."` | Fact / briefing context |
| `submissionTime` | `string` | `"2024-05-10T07:15Z"` | Record timestamp |
| `versionId` | `integer` | `1` | Record version |
| `link` | `string` | `"https://ccmc.gsfc.nasa.gov/..."` | Reference link |
| `linkedEvents` | `Array<{ activityID: string }> \| null` | `[{"activityID": "2024-05-10T06:54:00-CME-001"}]` | Links flare to associated CME / SEP |
| `sentNotifications` | `Array<{ messageID: string, messageIssueTime: string, messageURL: string }> \| null` | — | Notification metadata |

---

## 3. Coronal Mass Ejection (`GET /DONKI/CME`) — `CMEJSON` & `CMEAnalysisJSON` Schema

### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `startDate` | `string` (`yyyy-MM-dd`) | 30 days ago | Start date in UTC |
| `endDate` | `string` (`yyyy-MM-dd`) | Today (UTC) | End date in UTC |
| `mostAccurateOnly` | `boolean` | `false` (`true` on `/CMEAnalysis`) | Filter to single prime `CMEAnalysisJSON` |
| `completeEntryOnly` | `boolean` | `false` | Require complete analysis fields |
| `speed` | `integer` | `0` | Minimum speed in km/s |
| `halfAngle` | `integer` | `0` | Minimum half-angle in degrees |
| `catalog` | `string` | `"ALL"` | Catalog name (`ALL`, `M2M_CATALOG`, `SWRC_CATALOG`) |
| `api_key` | `string` | — | Server-side `NASA_API_KEY` |

### Exact JSON Response Fields (`CMEJSON`)
| Field Name | JSON Type | Example | Game Mapping (`donkiMapper.js`) |
|---|---|---|---|
| `activityID` | `string` | `"2024-05-10T06:54:00-CME-001"` | Unique event key (`event_key` in `donki_cache`, `id` in game timeline) |
| `catalog` | `string` | `"M2M_CATALOG"` | Source metadata |
| `startTime` | `string` (ISO UTC) | `"2024-05-10T06:54Z"` | Compressed onto the level's Sol timeline (`solOffset`) |
| `instruments` | `Array<{ displayName: string }>` | `[{"displayName": "SOHO: LASCO/C2"}]` | Science flavour text |
| `sourceLocation` | `string` | `"S15W20"` | Alert flavour text |
| `activeRegionNum` | `integer \| null` | `13664` | Alert flavour text (`"AR 13664"`) |
| `note` | `string` | `"Full halo CME observed in SOHO LASCO C2/C3."` | Fact / briefing context |
| `cmeAnalyses` | `Array<CMEAnalysisJSON> \| null` | See nested table below | Selects entry where `isMostAccurate === true` (or index `0`) for `speed` and `type` |
| `linkedEvents` | `Array<{ activityID: string }> \| null` | `[{"activityID": "2024-05-10T06:27:00-FLR-001"}]` | Cause-and-effect linkage |
| `sentNotifications` | `Array<SentNotificationObject> \| null` | — | Notification metadata |
| `submissionTime` | `string` | `"2024-05-10T08:10Z"` | Record timestamp |
| `versionId` | `integer` | `1` | Record version |
| `link` | `string` | `"https://ccmc.gsfc.nasa.gov/..."` | Reference link |

### Nested `CMEAnalysisJSON` Fields (`cme.cmeAnalyses[]`)
| Field Name | JSON Type | Example | Game Mapping (`donkiMapper.js`) |
|---|---|---|---|
| `isMostAccurate` | `boolean` | `true` | Preferred analysis selector |
| `levelOfData` | `integer` | `0`, `1` | Data quality level |
| `time21_5` | `string` | `"2024-05-10T09:12Z"` | Time at 21.5 solar radii |
| `latitude` | `number` (`float`) | `-15.0` | Propagation latitude (degrees) |
| `longitude` | `number` (`float`) | `20.0` | Propagation longitude (degrees) |
| `halfAngle` | `number` (`float`) | `45.0` | Angular half-width (degrees) |
| `speed` | `number` (`float`) | `1250.0` | Speed in km/s → determines warning `leadTime` (faster CME = shorter warning lead time) and severity (`<500` minor, `500–999` major, `>=1000` extreme) |
| `type` | `string` | `"S"`, `"C"`, `"O"`, `"R"`, `"E"` | NASA SCORE scale classification based on speed |
| `featureCode` | `string` | `"LE"`, `"SH"` | Leading Edge (`LE`) or Shock Front (`SH`) |
| `imageType` | `string` | `"running difference"` | Measurement metadata |
| `measurementTechnique` | `string` | `"SWPC_CAT"` | Measurement tool |
| `minorHalfWidth` | `number` (`float`) | `0.0` | Flux rope geometry |
| `speedMeasuredAtHeight` | `number` (`float`) | `12.5` | Solar radii at measurement |
| `tilt` | `number` (`float`) | `0.0` | Tilt angle |
| `enlilList` | `Array<WSAEnlilJSON> \| null` | — | Contains `estimatedShockArrivalTime`, `isEarthGB`, `kp_180`, `impactList` |
| `note` | `string` | — | Analyst notes |
| `submissionTime` | `string` | — | Analysis timestamp |
| `link` | `string` | — | Analysis URL |

---

## 4. Sources

1. **NASA CCMC DONKI OpenAPI 3.0 Specification (`v3/api-docs`)**: https://ccmc.gsfc.nasa.gov/DONKI-API/v3/api-docs
2. **NASA CCMC DONKI Swagger UI**: https://ccmc.gsfc.nasa.gov/DONKI-API/swagger-ui/index.html
3. **NASA CCMC DONKI API Reference**: https://ccmc.gsfc.nasa.gov/DONKI/api
4. **NASA CCMC DONKI Data Reference & SCORE Scale Guide**: https://ccmc.gsfc.nasa.gov/DONKI/guide/data-reference
5. **NASA Open APIs Authentication & Rate Limits**: https://api.nasa.gov/
6. **NASA CCMC Major API & Endpoint Updates**: https://api.nasa.gov/news/major-updates
