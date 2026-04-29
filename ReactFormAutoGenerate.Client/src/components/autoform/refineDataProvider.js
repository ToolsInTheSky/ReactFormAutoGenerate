/**
 * @file refineDataProvider.js
 * @description Custom Refine data provider wrapping @refinedev/simple-rest.
 * Overrides getOne, update, and deleteOne to remove /{id} from the URL.
 * The record identity is carried via x-id / x-identity-fields / x-keyless
 * request headers set by the schemaHeaders interceptor before each mutation.
 */

import dataProvider from "@refinedev/simple-rest";
import { axiosInstance } from "./axiosInstance";

/**
 * Creates a custom REST data provider.
 * @param {string} apiUrl - Base API URL (e.g. window.location.origin + "/api")
 * @returns Refine-compatible data provider
 */
export function createDataProvider(apiUrl) {
    const base = dataProvider(apiUrl, axiosInstance);

    return {
        ...base,

        // GET /api/{resource}  (no /{id} in URL — id is in x-id header)
        getOne: async ({ resource, id, meta }) => {
            const url = `${apiUrl}/${resource}`;
            const { headers, method } = meta ?? {};
            const requestMethod = method ?? "get";
            const { data } = await axiosInstance[requestMethod](url, { headers });
            return { data };
        },

        // PATCH /api/{resource}  (no /{id} in URL — id is in x-id header)
        update: async ({ resource, id, variables, meta }) => {
            const url = `${apiUrl}/${resource}`;
            const { headers, method } = meta ?? {};
            const requestMethod = method ?? "patch";
            const { data } = await axiosInstance[requestMethod](url, variables, { headers });
            return { data };
        },

        // DELETE /api/{resource}  (no /{id} in URL — id is in x-id header)
        deleteOne: async ({ resource, id, variables, meta }) => {
            const url = `${apiUrl}/${resource}`;
            const { headers, method } = meta ?? {};
            const requestMethod = method ?? "delete";
            const { data } = await axiosInstance[requestMethod](url, {
                data: variables,
                headers,
            });
            return { data };
        },
    };
}