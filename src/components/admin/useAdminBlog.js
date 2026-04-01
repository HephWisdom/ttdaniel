import { useContext } from "react";
import AdminBlogContext from "./adminBlogContextObject";

export default function useAdminBlog() {
  const context = useContext(AdminBlogContext);

  if (!context) {
    throw new Error("useAdminBlog must be used within AdminBlogProvider.");
  }

  return context;
}
