import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  Object,
  ObjectCreateRequest,
  ObjectUpdateRequest,
  Zone,
  ZoneCreateRequest,
  ZoneUpdateRequest,
  Beacon,
  BeaconCreateRequest,
  BeaconUpdateRequest,
  Contract,
  ContractCreateRequest,
  ContractUpdateRequest,
  UserExtended,
  UserCreateRequest,
  UserUpdateRequest,
  Attendance,
  AttendanceFilters,
  SLAViolation,
  SLARequirement,
  FraudAlert,
  FraudReviewRequest,
  Notification,
} from '../../types/entities';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Object', 'Zone', 'Beacon', 'Contract', 'User', 'Attendance', 'SLA', 'Fraud', 'Notification'],
  endpoints: (builder) => ({
    // ============ Objects ============
    getObjects: builder.query<Object[], void>({
      query: () => '/admin/objects',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Object' as const, id })),
              { type: 'Object', id: 'LIST' },
            ]
          : [{ type: 'Object', id: 'LIST' }],
    }),
    getObjectById: builder.query<Object, string>({
      query: (id) => `/admin/objects/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Object', id }],
    }),
    createObject: builder.mutation<Object, ObjectCreateRequest>({
      query: (body) => ({ url: '/admin/objects', method: 'POST', body }),
      invalidatesTags: [{ type: 'Object', id: 'LIST' }],
    }),
    updateObject: builder.mutation<Object, { id: string } & ObjectUpdateRequest>({
      query: ({ id, ...body }) => ({ url: `/admin/objects/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Object', id },
        { type: 'Object', id: 'LIST' },
      ],
    }),
    deleteObject: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/objects/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Object', id: 'LIST' }],
    }),

    // ============ Zones ============
    getZones: builder.query<Zone[], { objectId?: string } | void>({
      query: (params) => {
        const url = '/admin/zones';
        if (params && typeof params === 'object' && 'objectId' in params) {
          return { url, params: { object_id: params.objectId } };
        }
        return url;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Zone' as const, id })),
              { type: 'Zone', id: 'LIST' },
            ]
          : [{ type: 'Zone', id: 'LIST' }],
    }),
    getZoneById: builder.query<Zone, string>({
      query: (id) => `/admin/zones/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Zone', id }],
    }),
    createZone: builder.mutation<Zone, ZoneCreateRequest>({
      query: (body) => ({ url: '/admin/zones', method: 'POST', body }),
      invalidatesTags: [{ type: 'Zone', id: 'LIST' }],
    }),
    updateZone: builder.mutation<Zone, { id: string } & ZoneUpdateRequest>({
      query: ({ id, ...body }) => ({ url: `/admin/zones/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Zone', id },
        { type: 'Zone', id: 'LIST' },
      ],
    }),
    deleteZone: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/zones/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Zone', id: 'LIST' }],
    }),

    // ============ Beacons ============
    getBeacons: builder.query<Beacon[], { zoneId?: string; objectId?: string } | void>({
      query: (params) => {
        const url = '/admin/beacons';
        if (params && typeof params === 'object') {
          const queryParams: any = {};
          if ('zoneId' in params && params.zoneId) queryParams.zone_id = params.zoneId;
          if ('objectId' in params && params.objectId) queryParams.object_id = params.objectId;
          return { url, params: queryParams };
        }
        return url;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Beacon' as const, id })),
              { type: 'Beacon', id: 'LIST' },
            ]
          : [{ type: 'Beacon', id: 'LIST' }],
    }),
    getBeaconById: builder.query<Beacon, string>({
      query: (id) => `/admin/beacons/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Beacon', id }],
    }),
    createBeacon: builder.mutation<Beacon, BeaconCreateRequest>({
      query: (body) => ({ url: '/admin/beacons', method: 'POST', body }),
      invalidatesTags: [{ type: 'Beacon', id: 'LIST' }],
    }),
    updateBeacon: builder.mutation<Beacon, { id: string } & BeaconUpdateRequest>({
      query: ({ id, ...body }) => ({ url: `/admin/beacons/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Beacon', id },
        { type: 'Beacon', id: 'LIST' },
      ],
    }),
    deactivateBeacon: builder.mutation<Beacon, string>({
      query: (id) => ({ url: `/admin/beacons/${id}/deactivate`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Beacon', id },
        { type: 'Beacon', id: 'LIST' },
      ],
    }),

    // ============ Contracts ============
    getContracts: builder.query<Contract[], void>({
      query: () => '/admin/contracts',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Contract' as const, id })),
              { type: 'Contract', id: 'LIST' },
            ]
          : [{ type: 'Contract', id: 'LIST' }],
    }),
    getContractById: builder.query<Contract, string>({
      query: (id) => `/admin/contracts/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Contract', id }],
    }),
    createContract: builder.mutation<Contract, ContractCreateRequest>({
      query: (body) => ({ url: '/admin/contracts', method: 'POST', body }),
      invalidatesTags: [{ type: 'Contract', id: 'LIST' }],
    }),
    updateContract: builder.mutation<Contract, { id: string } & ContractUpdateRequest>({
      query: ({ id, ...body }) => ({ url: `/admin/contracts/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Contract', id },
        { type: 'Contract', id: 'LIST' },
      ],
    }),
    deleteContract: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/contracts/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Contract', id: 'LIST' }],
    }),

    // ============ Users ============
    getUsers: builder.query<UserExtended[], { role?: string; isActive?: boolean } | void>({
      query: (params) => {
        const url = '/admin/users';
        if (params && typeof params === 'object') {
          const queryParams: any = {};
          if ('role' in params && params.role) queryParams.role = params.role;
          if ('isActive' in params && params.isActive !== undefined) queryParams.is_active = params.isActive;
          return { url, params: queryParams };
        }
        return url;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),
    getUserById: builder.query<UserExtended, string>({
      query: (id) => `/admin/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation<UserExtended, UserCreateRequest>({
      query: (body) => ({ url: '/admin/users', method: 'POST', body }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),
    updateUser: builder.mutation<UserExtended, { id: string } & UserUpdateRequest>({
      query: ({ id, ...body }) => ({ url: `/admin/users/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),
    deactivateUser: builder.mutation<UserExtended, string>({
      query: (id) => ({ url: `/admin/users/${id}/deactivate`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    // ============ Attendance ============
    getAttendance: builder.query<Attendance[], AttendanceFilters | void>({
      query: (params) => {
        const url = '/admin/attendance';
        return params ? { url, params } : url;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Attendance' as const, id })),
              { type: 'Attendance', id: 'LIST' },
            ]
          : [{ type: 'Attendance', id: 'LIST' }],
    }),
    getMyAttendance: builder.query<Attendance[], AttendanceFilters | void>({
      query: (params) => {
        const url = '/mobile/my-attendance';
        return params ? { url, params } : url;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Attendance' as const, id })),
              { type: 'Attendance', id: 'MY_LIST' },
            ]
          : [{ type: 'Attendance', id: 'MY_LIST' }],
    }),

    // ============ SLA ============
    getSLAViolations: builder.query<SLAViolation[], { objectId?: string; status?: string } | void>({
      query: (params) => {
        const url = '/admin/sla/violations';
        return params ? { url, params } : url;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SLA' as const, id })),
              { type: 'SLA', id: 'VIOLATIONS' },
            ]
          : [{ type: 'SLA', id: 'VIOLATIONS' }],
    }),
    getSLARequirements: builder.query<SLARequirement[], { objectId?: string } | void>({
      query: (params) => {
        const url = '/admin/sla/requirements';
        return params ? { url, params } : url;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SLA' as const, id })),
              { type: 'SLA', id: 'REQUIREMENTS' },
            ]
          : [{ type: 'SLA', id: 'REQUIREMENTS' }],
    }),

    // ============ Fraud ============
    getFraudAlerts: builder.query<FraudAlert[], { status?: string; severity?: string } | void>({
      query: (params) => {
        const url = '/admin/fraud';
        return params ? { url, params } : url;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Fraud' as const, id })),
              { type: 'Fraud', id: 'LIST' },
            ]
          : [{ type: 'Fraud', id: 'LIST' }],
    }),
    reviewFraudAlert: builder.mutation<FraudAlert, { id: string } & FraudReviewRequest>({
      query: ({ id, ...body }) => ({ url: `/admin/fraud/${id}/review`, method: 'POST', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Fraud', id },
        { type: 'Fraud', id: 'LIST' },
      ],
    }),

    // ============ Notifications ============
    getNotifications: builder.query<Notification[], void>({
      query: () => '/notifications',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Notification' as const, id })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
    }),
    markNotificationAsRead: builder.mutation<Notification, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PUT' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    markAllNotificationsAsRead: builder.mutation<void, void>({
      query: () => ({ url: '/notifications/mark-all-read', method: 'POST' }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Objects
  useGetObjectsQuery,
  useGetObjectByIdQuery,
  useCreateObjectMutation,
  useUpdateObjectMutation,
  useDeleteObjectMutation,
  // Zones
  useGetZonesQuery,
  useGetZoneByIdQuery,
  useCreateZoneMutation,
  useUpdateZoneMutation,
  useDeleteZoneMutation,
  // Beacons
  useGetBeaconsQuery,
  useGetBeaconByIdQuery,
  useCreateBeaconMutation,
  useUpdateBeaconMutation,
  useDeactivateBeaconMutation,
  // Contracts
  useGetContractsQuery,
  useGetContractByIdQuery,
  useCreateContractMutation,
  useUpdateContractMutation,
  useDeleteContractMutation,
  // Users
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  // Attendance
  useGetAttendanceQuery,
  useGetMyAttendanceQuery,
  // SLA
  useGetSLAViolationsQuery,
  useGetSLARequirementsQuery,
  // Fraud
  useGetFraudAlertsQuery,
  useReviewFraudAlertMutation,
  // Notifications
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
} = apiSlice;
