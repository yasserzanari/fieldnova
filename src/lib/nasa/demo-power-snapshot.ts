import type { PowerMonthlyRecord } from './power'

/** NASA POWER monthly snapshot captured on 2026-11-15 for the fictitious demo point. */
export const demoPowerSnapshot = {
  metadata: {
    "point": {
      "latitude": 46.2276,
      "longitude": 2.2137
    },
    "requestPoint": {
      "latitude": 46.228,
      "longitude": 2.214
    },
    "retrievedAt": "2026-11-15T01:23:20Z",
    "firstMonth": "2022-01",
    "lastCompleteMonth": "2026-09",
    "source": [
      "MERRA2",
      "POWER"
    ],
    "timeStandard": "UTC",
    "parameters": {
      "GWETROOT": {
        "units": "1",
        "longname": "Root Zone Soil Wetness"
      },
      "GWETTOP": {
        "units": "1",
        "longname": "Surface Soil Wetness"
      },
      "PRECTOTCORR": {
        "units": "mm/day",
        "longname": "Precipitation Corrected"
      },
      "T2M": {
        "units": "C",
        "longname": "Temperature at 2 Meters"
      },
      "T2M_MAX": {
        "units": "C",
        "longname": "Temperature at 2 Meters Maximum"
      },
      "T2M_MIN": {
        "units": "C",
        "longname": "Temperature at 2 Meters Minimum"
      }
    },
    "request": {
      "endpoint": "https://power.larc.nasa.gov/api/temporal/monthly/point",
      "community": "AG",
      "start": "2022",
      "end": "2026",
      "format": "JSON",
      "requestedParameters": [
        "GWETROOT",
        "GWETTOP",
        "PRECTOTCORR",
        "T2M",
        "T2M_MAX",
        "T2M_MIN"
      ],
      "note": "Snapshot captured 2026-11-15; only closed calendar months retained. NASA POWER annual YYYY13 summaries excluded."
    }
  } as const,
  requestedMonths: ["2022-01","2022-02","2022-03","2022-04","2022-05","2022-06","2022-07","2022-08","2022-09","2022-10","2022-11","2022-12","2023-01","2023-02","2023-03","2023-04","2023-05","2023-06","2023-07","2023-08","2023-09","2023-10","2023-11","2023-12","2024-01","2024-02","2024-03","2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12","2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07","2026-08","2026-09","2026-10"],
  records: [
    {
      "date": "2022-01",
      "precipitationMmPerDay": 0.83,
      "temperatureC": 0.9,
      "temperatureMaxC": 13.95,
      "temperatureMinC": -4.82,
      "surfaceSoilWetness": 0.66,
      "rootZoneWetness": 0.6
    },
    {
      "date": "2022-02",
      "precipitationMmPerDay": 1.06,
      "temperatureC": 3.94,
      "temperatureMaxC": 12.41,
      "temperatureMinC": -3.73,
      "surfaceSoilWetness": 0.66,
      "rootZoneWetness": 0.6
    },
    {
      "date": "2022-03",
      "precipitationMmPerDay": 1.18,
      "temperatureC": 6.59,
      "temperatureMaxC": 18.11,
      "temperatureMinC": -4.8,
      "surfaceSoilWetness": 0.64,
      "rootZoneWetness": 0.58
    },
    {
      "date": "2022-04",
      "precipitationMmPerDay": 1.41,
      "temperatureC": 8.29,
      "temperatureMaxC": 19.41,
      "temperatureMinC": -5.26,
      "surfaceSoilWetness": 0.6,
      "rootZoneWetness": 0.53
    },
    {
      "date": "2022-05",
      "precipitationMmPerDay": 1.14,
      "temperatureC": 15.41,
      "temperatureMaxC": 28.28,
      "temperatureMinC": 3.83,
      "surfaceSoilWetness": 0.47,
      "rootZoneWetness": 0.44
    },
    {
      "date": "2022-06",
      "precipitationMmPerDay": 5.69,
      "temperatureC": 19.01,
      "temperatureMaxC": 35.9,
      "temperatureMinC": 8.34,
      "surfaceSoilWetness": 0.45,
      "rootZoneWetness": 0.41
    },
    {
      "date": "2022-07",
      "precipitationMmPerDay": 0.41,
      "temperatureC": 20.48,
      "temperatureMaxC": 35.04,
      "temperatureMinC": 6.75,
      "surfaceSoilWetness": 0.36,
      "rootZoneWetness": 0.38
    },
    {
      "date": "2022-08",
      "precipitationMmPerDay": 1.73,
      "temperatureC": 21.65,
      "temperatureMaxC": 35.74,
      "temperatureMinC": 11.53,
      "surfaceSoilWetness": 0.31,
      "rootZoneWetness": 0.33
    },
    {
      "date": "2022-09",
      "precipitationMmPerDay": 2.48,
      "temperatureC": 15.37,
      "temperatureMaxC": 33.22,
      "temperatureMinC": 3.05,
      "surfaceSoilWetness": 0.37,
      "rootZoneWetness": 0.36
    },
    {
      "date": "2022-10",
      "precipitationMmPerDay": 1.2,
      "temperatureC": 15.24,
      "temperatureMaxC": 26.14,
      "temperatureMinC": 5.51,
      "surfaceSoilWetness": 0.4,
      "rootZoneWetness": 0.39
    },
    {
      "date": "2022-11",
      "precipitationMmPerDay": 2.09,
      "temperatureC": 7.96,
      "temperatureMaxC": 20.68,
      "temperatureMinC": -0.88,
      "surfaceSoilWetness": 0.47,
      "rootZoneWetness": 0.42
    },
    {
      "date": "2022-12",
      "precipitationMmPerDay": 1.55,
      "temperatureC": 3.34,
      "temperatureMaxC": 15.3,
      "temperatureMinC": -7.01,
      "surfaceSoilWetness": 0.55,
      "rootZoneWetness": 0.48
    },
    {
      "date": "2023-01",
      "precipitationMmPerDay": 1.5,
      "temperatureC": 1.97,
      "temperatureMaxC": 14.56,
      "temperatureMinC": -7.82,
      "surfaceSoilWetness": 0.6,
      "rootZoneWetness": 0.53
    },
    {
      "date": "2023-02",
      "precipitationMmPerDay": 0.45,
      "temperatureC": 2.73,
      "temperatureMaxC": 16.02,
      "temperatureMinC": -5.09,
      "surfaceSoilWetness": 0.6,
      "rootZoneWetness": 0.53
    },
    {
      "date": "2023-03",
      "precipitationMmPerDay": 2.16,
      "temperatureC": 6.45,
      "temperatureMaxC": 19.45,
      "temperatureMinC": -4.07,
      "surfaceSoilWetness": 0.61,
      "rootZoneWetness": 0.54
    },
    {
      "date": "2023-04",
      "precipitationMmPerDay": 1.84,
      "temperatureC": 8.15,
      "temperatureMaxC": 20.54,
      "temperatureMinC": -3.77,
      "surfaceSoilWetness": 0.59,
      "rootZoneWetness": 0.53
    },
    {
      "date": "2023-05",
      "precipitationMmPerDay": 2.33,
      "temperatureC": 12.7,
      "temperatureMaxC": 23.95,
      "temperatureMinC": 3.66,
      "surfaceSoilWetness": 0.57,
      "rootZoneWetness": 0.51
    },
    {
      "date": "2023-06",
      "precipitationMmPerDay": 3.41,
      "temperatureC": 18.95,
      "temperatureMaxC": 28.8,
      "temperatureMinC": 10.41,
      "surfaceSoilWetness": 0.48,
      "rootZoneWetness": 0.43
    },
    {
      "date": "2023-07",
      "precipitationMmPerDay": 1.11,
      "temperatureC": 19.97,
      "temperatureMaxC": 33.67,
      "temperatureMinC": 9.87,
      "surfaceSoilWetness": 0.35,
      "rootZoneWetness": 0.36
    },
    {
      "date": "2023-08",
      "precipitationMmPerDay": 1.8,
      "temperatureC": 20.57,
      "temperatureMaxC": 37.82,
      "temperatureMinC": 7.4,
      "surfaceSoilWetness": 0.33,
      "rootZoneWetness": 0.34
    },
    {
      "date": "2023-09",
      "precipitationMmPerDay": 1.53,
      "temperatureC": 20.03,
      "temperatureMaxC": 36.05,
      "temperatureMinC": 4.47,
      "surfaceSoilWetness": 0.33,
      "rootZoneWetness": 0.34
    },
    {
      "date": "2023-10",
      "precipitationMmPerDay": 3.29,
      "temperatureC": 14.29,
      "temperatureMaxC": 30.82,
      "temperatureMinC": 4.54,
      "surfaceSoilWetness": 0.39,
      "rootZoneWetness": 0.36
    },
    {
      "date": "2023-11",
      "precipitationMmPerDay": 3.55,
      "temperatureC": 6.39,
      "temperatureMaxC": 15.01,
      "temperatureMinC": -2.42,
      "surfaceSoilWetness": 0.61,
      "rootZoneWetness": 0.53
    },
    {
      "date": "2023-12",
      "precipitationMmPerDay": 3.1,
      "temperatureC": 4.34,
      "temperatureMaxC": 11.84,
      "temperatureMinC": -5.98,
      "surfaceSoilWetness": 0.7,
      "rootZoneWetness": 0.64
    },
    {
      "date": "2024-01",
      "precipitationMmPerDay": 1.4,
      "temperatureC": 2.83,
      "temperatureMaxC": 13.76,
      "temperatureMinC": -8.1,
      "surfaceSoilWetness": 0.73,
      "rootZoneWetness": 0.69
    },
    {
      "date": "2024-02",
      "precipitationMmPerDay": 2.07,
      "temperatureC": 5.58,
      "temperatureMaxC": 15.11,
      "temperatureMinC": -1.06,
      "surfaceSoilWetness": 0.74,
      "rootZoneWetness": 0.71
    },
    {
      "date": "2024-03",
      "precipitationMmPerDay": 3.36,
      "temperatureC": 7.19,
      "temperatureMaxC": 18.93,
      "temperatureMinC": -2.37,
      "surfaceSoilWetness": 0.76,
      "rootZoneWetness": 0.73
    },
    {
      "date": "2024-04",
      "precipitationMmPerDay": 2.03,
      "temperatureC": 8.57,
      "temperatureMaxC": 24.76,
      "temperatureMinC": -0.84,
      "surfaceSoilWetness": 0.73,
      "rootZoneWetness": 0.7
    },
    {
      "date": "2024-05",
      "precipitationMmPerDay": 4.3,
      "temperatureC": 11.7,
      "temperatureMaxC": 23.67,
      "temperatureMinC": 2.01,
      "surfaceSoilWetness": 0.75,
      "rootZoneWetness": 0.71
    },
    {
      "date": "2024-06",
      "precipitationMmPerDay": 3.89,
      "temperatureC": 16.05,
      "temperatureMaxC": 26.67,
      "temperatureMinC": 6.42,
      "surfaceSoilWetness": 0.7,
      "rootZoneWetness": 0.65
    },
    {
      "date": "2024-07",
      "precipitationMmPerDay": 2.22,
      "temperatureC": 18.83,
      "temperatureMaxC": 33.15,
      "temperatureMinC": 8.38,
      "surfaceSoilWetness": 0.63,
      "rootZoneWetness": 0.57
    },
    {
      "date": "2024-08",
      "precipitationMmPerDay": 1.23,
      "temperatureC": 20.05,
      "temperatureMaxC": 33.2,
      "temperatureMinC": 8.76,
      "surfaceSoilWetness": 0.44,
      "rootZoneWetness": 0.41
    },
    {
      "date": "2024-09",
      "precipitationMmPerDay": 3.91,
      "temperatureC": 13.48,
      "temperatureMaxC": 26.95,
      "temperatureMinC": 2.06,
      "surfaceSoilWetness": 0.49,
      "rootZoneWetness": 0.43
    },
    {
      "date": "2024-10",
      "precipitationMmPerDay": 2.87,
      "temperatureC": 12.95,
      "temperatureMaxC": 22.13,
      "temperatureMinC": 5.2,
      "surfaceSoilWetness": 0.58,
      "rootZoneWetness": 0.5
    },
    {
      "date": "2024-11",
      "precipitationMmPerDay": 1.71,
      "temperatureC": 7.57,
      "temperatureMaxC": 19.19,
      "temperatureMinC": -5.4,
      "surfaceSoilWetness": 0.59,
      "rootZoneWetness": 0.52
    },
    {
      "date": "2024-12",
      "precipitationMmPerDay": 1.75,
      "temperatureC": 2.79,
      "temperatureMaxC": 14.61,
      "temperatureMinC": -3.47,
      "surfaceSoilWetness": 0.65,
      "rootZoneWetness": 0.58
    },
    {
      "date": "2025-01",
      "precipitationMmPerDay": 1.74,
      "temperatureC": 2.6,
      "temperatureMaxC": 11.62,
      "temperatureMinC": -7.92,
      "surfaceSoilWetness": 0.68,
      "rootZoneWetness": 0.63
    },
    {
      "date": "2025-02",
      "precipitationMmPerDay": 0.56,
      "temperatureC": 4.28,
      "temperatureMaxC": 15.55,
      "temperatureMinC": -4.46,
      "surfaceSoilWetness": 0.68,
      "rootZoneWetness": 0.63
    },
    {
      "date": "2025-03",
      "precipitationMmPerDay": 0.82,
      "temperatureC": 6.03,
      "temperatureMaxC": 16.02,
      "temperatureMinC": -3.37,
      "surfaceSoilWetness": 0.64,
      "rootZoneWetness": 0.59
    },
    {
      "date": "2025-04",
      "precipitationMmPerDay": 1.09,
      "temperatureC": 10.33,
      "temperatureMaxC": 23.21,
      "temperatureMinC": 0.2,
      "surfaceSoilWetness": 0.57,
      "rootZoneWetness": 0.51
    },
    {
      "date": "2025-05",
      "precipitationMmPerDay": 0.67,
      "temperatureC": 13.98,
      "temperatureMaxC": 31.12,
      "temperatureMinC": 4.32,
      "surfaceSoilWetness": 0.43,
      "rootZoneWetness": 0.42
    },
    {
      "date": "2025-06",
      "precipitationMmPerDay": 2.11,
      "temperatureC": 21.06,
      "temperatureMaxC": 36.39,
      "temperatureMinC": 8.44,
      "surfaceSoilWetness": 0.37,
      "rootZoneWetness": 0.38
    },
    {
      "date": "2025-07",
      "precipitationMmPerDay": 0.54,
      "temperatureC": 20.57,
      "temperatureMaxC": 36.75,
      "temperatureMinC": 10.14,
      "surfaceSoilWetness": 0.28,
      "rootZoneWetness": 0.31
    },
    {
      "date": "2025-08",
      "precipitationMmPerDay": 0.85,
      "temperatureC": 21.74,
      "temperatureMaxC": 39.27,
      "temperatureMinC": 9.26,
      "surfaceSoilWetness": 0.22,
      "rootZoneWetness": 0.29
    },
    {
      "date": "2025-09",
      "precipitationMmPerDay": 1.18,
      "temperatureC": 14.91,
      "temperatureMaxC": 33.11,
      "temperatureMinC": 4.2,
      "surfaceSoilWetness": 0.32,
      "rootZoneWetness": 0.32
    },
    {
      "date": "2025-10",
      "precipitationMmPerDay": 1.2,
      "temperatureC": 10.93,
      "temperatureMaxC": 21.56,
      "temperatureMinC": 3.77,
      "surfaceSoilWetness": 0.34,
      "rootZoneWetness": 0.33
    },
    {
      "date": "2025-11",
      "precipitationMmPerDay": 1.23,
      "temperatureC": 6.65,
      "temperatureMaxC": 20.55,
      "temperatureMinC": -5.38,
      "surfaceSoilWetness": 0.39,
      "rootZoneWetness": 0.37
    },
    {
      "date": "2025-12",
      "precipitationMmPerDay": 0.86,
      "temperatureC": 4.62,
      "temperatureMaxC": 14.48,
      "temperatureMinC": -7.86,
      "surfaceSoilWetness": 0.44,
      "rootZoneWetness": 0.41
    },
    {
      "date": "2026-01",
      "precipitationMmPerDay": 1.02,
      "temperatureC": 2.03,
      "temperatureMaxC": 11.57,
      "temperatureMinC": -10.18,
      "surfaceSoilWetness": 0.49,
      "rootZoneWetness": 0.44
    },
    {
      "date": "2026-02",
      "precipitationMmPerDay": 1.98,
      "temperatureC": 6.25,
      "temperatureMaxC": 20.19,
      "temperatureMinC": -5.08,
      "surfaceSoilWetness": 0.56,
      "rootZoneWetness": 0.49
    },
    {
      "date": "2026-03",
      "precipitationMmPerDay": 0.54,
      "temperatureC": 6.21,
      "temperatureMaxC": 17.11,
      "temperatureMinC": -4.23,
      "surfaceSoilWetness": 0.53,
      "rootZoneWetness": 0.48
    },
    {
      "date": "2026-04",
      "precipitationMmPerDay": 0.42,
      "temperatureC": 12.24,
      "temperatureMaxC": 25.28,
      "temperatureMinC": 0.15,
      "surfaceSoilWetness": 0.43,
      "rootZoneWetness": 0.42
    },
    {
      "date": "2026-05",
      "precipitationMmPerDay": 0.8,
      "temperatureC": 16.03,
      "temperatureMaxC": 33.49,
      "temperatureMinC": 3.36,
      "surfaceSoilWetness": 0.34,
      "rootZoneWetness": 0.36
    },
    {
      "date": "2026-06",
      "precipitationMmPerDay": 0.25,
      "temperatureC": 22.91,
      "temperatureMaxC": 38.99,
      "temperatureMinC": 8.32,
      "surfaceSoilWetness": 0.24,
      "rootZoneWetness": 0.3
    },
    {
      "date": "2026-07",
      "precipitationMmPerDay": 0.18,
      "temperatureC": 24.96,
      "temperatureMaxC": 37.85,
      "temperatureMinC": 11.97,
      "surfaceSoilWetness": 0.16,
      "rootZoneWetness": 0.28
    },
    {
      "date": "2026-08",
      "precipitationMmPerDay": 1.17,
      "temperatureC": 23.51,
      "temperatureMaxC": 37.61,
      "temperatureMinC": 10.5,
      "surfaceSoilWetness": 0.24,
      "rootZoneWetness": 0.29
    },
    {
      "date": "2026-09",
      "precipitationMmPerDay": 0.24,
      "temperatureC": 19.18,
      "temperatureMaxC": 33.27,
      "temperatureMinC": 7.97,
      "surfaceSoilWetness": 0.23,
      "rootZoneWetness": 0.29
    }
  ] as PowerMonthlyRecord[],
}
