/**
 * @file axiosInstance.js
 * @description Re-exports the axios instance used internally by @refinedev/simple-rest.
 * Pass this as the second argument to dataProvider() in App.jsx so that
 * interceptors registered on it (e.g. schema headers) apply to all Refine requests.
 */

export { axiosInstance } from "@refinedev/simple-rest";
