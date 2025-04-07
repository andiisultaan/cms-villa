"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { toast, Toaster } from "sonner";
import EditVillaForm from "@/components/EditVillaForm";
import Navigation from "@/components/navigation";
import type { SerializedVillaModel } from "@/db/models/villa";

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
        console.log(error);
        toast.error("Failed to fetch villa data");
      } finally {
        setLoading(false);
      }
    };

    fetchVilla();
  }, [id]);

  const handleUpdateVilla = async (updatedData: Partial<SerializedVillaModel>) => {
    try {
      const formData = new FormData();

      // Append text fields
      Object.entries(updatedData).forEach(([key, value]) => {
        if (key !== "images" && key !== "facilities" && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      // Handle facilities - convert to JSON string
      if (updatedData.facilities) {
        formData.append("facilities", JSON.stringify(updatedData.facilities));
      } else if (villa && villa.facilities) {
        // If no new facilities were provided, keep the existing ones
        formData.append("facilities", JSON.stringify(villa.facilities));
      }

      // Handle owner
      if (updatedData.owner) {
        formData.append("owner", updatedData.owner.toString());
      } else if (villa && villa.owner) {
        // If no new owner was provided, keep the existing one
        formData.append("owner", villa.owner.toString());
      }

      // Handle images
      if (updatedData.images) {
        updatedData.images.forEach(img => {
          if (img.file instanceof File) {
            formData.append(`images`, img.file);
          } else if (img.url) {
            // For existing images, we send the URL and publicId
            formData.append(`images`, JSON.stringify({ url: img.url, publicId: img.publicId }));
          }
        });
      } else if (villa && villa.images) {
        // If no new images were added, keep the existing ones
        villa.images.forEach(img => {
          formData.append(`images`, JSON.stringify({ url: img.url, publicId: img.publicId }));
        });
      }

      // For debugging - log the form data
      // for (let [key, value] of formData.entries()) {
      //   console.log(`${key}: ${value}`);
      // }

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
