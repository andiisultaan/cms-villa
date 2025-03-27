"use client";

import type React from "react";

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
  facilities: {
    bathroom: boolean;
    wifi: boolean;
    bed: boolean;
    parking: boolean;
    kitchen: boolean;
    ac: boolean;
    tv: boolean;
    pool: boolean;
  };
}

export default function AddVilla() {
  const [formData, setFormData] = useState<VillaFormData>({
    name: "",
    description: "",
    price: "",
    capacity: "",
    status: "available",
    images: [],
    facilities: {
      bathroom: false,
      wifi: false,
      bed: false,
      parking: false,
      kitchen: false,
      ac: false,
      tv: false,
      pool: false,
    },
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

  const handleFacilityChange = (facility: string) => {
    setFormData(prevData => ({
      ...prevData,
      facilities: {
        ...prevData.facilities,
        [facility]: !prevData.facilities[facility as keyof typeof prevData.facilities],
      },
    }));
  };

  async function addVilla(e: React.FormEvent) {
    e.preventDefault();
    const formDataToSend = new FormData();

    // Append all form fields
    formDataToSend.append("name", formData.name);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("price", formData.price);
    formDataToSend.append("capacity", formData.capacity);
    formDataToSend.append("status", formData.status);

    // Append facilities as JSON
    formDataToSend.append("facilities", JSON.stringify(formData.facilities));

    // Append all images
    formData.images.forEach(image => {
      formDataToSend.append(`images`, image);
    });

    try {
      const response = await fetch("/api/villas", {
        method: "POST",
        body: formDataToSend, // Send as FormData
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Successfully added new villa!", {
          description: "Redirecting you to the dashboard page...",
        });
        setTimeout(() => router.push("/"), 2000);
      } else {
        toast.error(data.error || "Failed to add villa", {
          description: "Please check your information and try again.",
        });
      }
    } catch (error) {
      console.log(error);
      toast.error("An unexpected error occurred", {
        description: "Please try again later.",
      });
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Toaster richColors />
      <Navigation />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Add New Villa 🏡</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addVilla} className="space-y-6">
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
                  <Label>Facilities</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="bathroom" checked={formData.facilities.bathroom} onChange={() => handleFacilityChange("bathroom")} className="rounded border-gray-300 text-primary focus:ring-primary" />
                      <Label htmlFor="bathroom" className="cursor-pointer">
                        Bathroom
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="wifi" checked={formData.facilities.wifi} onChange={() => handleFacilityChange("wifi")} className="rounded border-gray-300 text-primary focus:ring-primary" />
                      <Label htmlFor="wifi" className="cursor-pointer">
                        WiFi
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="bed" checked={formData.facilities.bed} onChange={() => handleFacilityChange("bed")} className="rounded border-gray-300 text-primary focus:ring-primary" />
                      <Label htmlFor="bed" className="cursor-pointer">
                        Bed
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="parking" checked={formData.facilities.parking} onChange={() => handleFacilityChange("parking")} className="rounded border-gray-300 text-primary focus:ring-primary" />
                      <Label htmlFor="parking" className="cursor-pointer">
                        Parking
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="kitchen" checked={formData.facilities.kitchen} onChange={() => handleFacilityChange("kitchen")} className="rounded border-gray-300 text-primary focus:ring-primary" />
                      <Label htmlFor="kitchen" className="cursor-pointer">
                        Kitchen
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="ac" checked={formData.facilities.ac} onChange={() => handleFacilityChange("ac")} className="rounded border-gray-300 text-primary focus:ring-primary" />
                      <Label htmlFor="ac" className="cursor-pointer">
                        AC
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="tv" checked={formData.facilities.tv} onChange={() => handleFacilityChange("tv")} className="rounded border-gray-300 text-primary focus:ring-primary" />
                      <Label htmlFor="tv" className="cursor-pointer">
                        TV
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="pool" checked={formData.facilities.pool} onChange={() => handleFacilityChange("pool")} className="rounded border-gray-300 text-primary focus:ring-primary" />
                      <Label htmlFor="pool" className="cursor-pointer">
                        Pool
                      </Label>
                    </div>
                  </div>
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
