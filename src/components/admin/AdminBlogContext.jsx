import AdminBlogContext from "./adminBlogContextObject";

export function AdminBlogProvider({ children, value }) {
  return <AdminBlogContext.Provider value={value}>{children}</AdminBlogContext.Provider>;
}
