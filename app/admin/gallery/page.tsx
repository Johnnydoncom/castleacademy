import { GalleryManager } from "@/components/admin/gallery-manager";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata = {
  title: "Gallery — Castle Academy Admin",
};

export default function GalleryPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8">
      <AdminPageHeader
        title="Gallery"
        description="Upload, order and choose the photos and videos shown in the homepage gallery."
      />
      <GalleryManager />
    </div>
  );
}
