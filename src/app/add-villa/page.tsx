"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, X } from "lucide-react";
import Navigation from "@/components/navigation";
import { toast, Toaster } from "sonner";

interface VillaFormData {
  name: string;
  description: string;
  price: string;
  capacity: string;
  status: string;
  images: File[];
}

export default function AddVilla() {
  const [formData, setFormData] = useState<VillaFormData>({
    name: "",
    description: "",
    price: "",
    capacity: "",
    status: "available",
    images: [],
  });
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleStatusChange = (value: string) => {
    setFormData(prevData => ({
      ...prevData,
      status: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large`, {
          description: "Please select images smaller than 5MB",
        });
        return false;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`, {
          description: "Please select only image files",
        });
        return false;
      }
      return true;
    });

    setFormData(prevData => ({
      ...prevData,
      images: [...prevData.images, ...validFiles],
    }));

    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prevUrls => [...prevUrls, ...newPreviewUrls]);

    return () => newPreviewUrls.forEach(URL.revokeObjectURL);
  };

  const removeImage = (index: number) => {
    setFormData(prevData => ({
      ...prevData,
      images: prevData.images.filter((_, i) => i !== index),
    }));
    setPreviewUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("description", formData.description);
      submitData.append("price", formData.price);
      submitData.append("capacity", formData.capacity);
      submitData.append("status", formData.status);
      formData.images.forEach((image, index) => {
        submitData.append(`image${index}`, image);
      });

      console.log("Form data to be submitted:", Object.fromEntries(submitData));

      toast.success("Villa added successfully!");
      setFormData({
        name: "",
        description: "",
        price: "",
        capacity: "",
        status: "available",
        images: [],
      });
      setPreviewUrls([]);
      router.push("/");
    } catch (error) {
      toast.error("Failed to add villa");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Toaster richColors />
      <Navigation />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Add New Villa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Villa Name</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" value={formData.description} onChange={handleChange} required className="min-h-[100px]" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price per Night</Label>
                    <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange} required min="0" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input id="capacity" name="capacity" type="number" value={formData.capacity} onChange={handleChange} required min="1" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="booked">Booked</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Villa Images</Label>
                  <div className="flex flex-wrap items-center gap-4">
                    <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" multiple />

                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative w-24 h-24">
                        <Image src={url || "/placeholder.svg"} alt={`Villa preview ${index + 1}`} fill className="object-cover rounded-lg" />
                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => removeImage(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Label htmlFor="image-upload" className="w-24 h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg hover:bg-gray-50 cursor-pointer">
                      <ImagePlus className="h-8 w-8 text-gray-400" />
                      <span className="text-xs text-gray-600 text-center">Upload Images</span>
                    </Label>

                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Upload images of the villa (max 5MB each)</p>
                      <p className="text-xs text-gray-400 mt-1">Supported formats: JPG, PNG, GIF</p>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Add Villa
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
