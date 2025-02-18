"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import type { SerializedVillaModel } from "@/db/models/villa";
import { toast, Toaster } from "sonner";
import EditVillaForm from "@/components/EditVillaForm";
import Navigation from "@/components/navigation";

export default function EditVilla() {
  const [villa, setVilla] = useState<SerializedVillaModel | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    const fetchVilla = async () => {
      try {
        const response = await fetch(`/api/villas/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch villa");
        }
        const data = await response.json();
        setVilla(data.data);
      } catch (error) {
        toast.error("Failed to fetch villa data");
      } finally {
        setLoading(false);
      }
    };

    fetchVilla();
  }, [id]);

  const handleUpdateVilla = async (updatedData: SerializedVillaModel) => {
    try {
      const formData = new FormData();

      // Append text fields
      Object.entries(updatedData).forEach(([key, value]) => {
        if (key !== "images" && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      // Handle images
      const existingImages = updatedData.images.filter(img => !img.file);
      const newImages = updatedData.images.filter(img => img.file);

      formData.append("existingImages", JSON.stringify(existingImages));
      newImages.forEach((img, index) => {
        if (img.file) {
          formData.append(`newImages`, img.file);
        }
      });

      // Append all images data as JSON
      formData.append(
        "imagesData",
        JSON.stringify(
          updatedData.images.map(img => ({
            url: img.url,
            publicId: img.publicId,
            isNew: !!img.file,
          }))
        )
      );

      const response = await fetch(`/api/villas/${id}`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update villa");
      }

      toast.success("Villa updated successfully");
      router.push("/");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update villa");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!villa) {
    return <div>Villa not found</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Toaster richColors />
      <Navigation />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <EditVillaForm villa={villa} onSubmit={handleUpdateVilla} />
        </div>
      </main>
    </div>
  );
}
