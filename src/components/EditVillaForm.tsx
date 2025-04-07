"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ImagePlus, Loader2 } from "lucide-react";
import type { SerializedVillaModel } from "@/db/models/villa";

interface EditVillaFormProps {
  villa: SerializedVillaModel;
  onSubmit: (updatedData: SerializedVillaModel) => void;
}

interface User {
  _id: string;
  username: string;
  role: string;
}

export default function EditVillaForm({ villa, onSubmit }: EditVillaFormProps) {
  const [formData, setFormData] = useState<SerializedVillaModel>(villa);
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Try to fetch only owners if the API supports filtering
      const response = await fetch("/api/users?role=owner");
      if (response.ok) {
        const data = await response.json();

        // Process the response data
        let usersList: User[] = [];

        if (Array.isArray(data)) {
          usersList = data;
        } else if (data && Array.isArray(data.users)) {
          usersList = data.users;
        } else if (data && Array.isArray(data.data)) {
          usersList = data.data;
        } else {
          console.error("Unexpected API response format:", data);
          setUsers([]);
          return;
        }

        // Filter users to only include those with the owner role
        const ownerUsers = usersList.filter(user => user.role === "owner");
        setUsers(ownerUsers);
      } else {
        console.error("Failed to fetch users");
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  };

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
      status: value as "available" | "booked" | "maintenance",
    }));
  };

  const handleOwnerChange = (value: string) => {
    setFormData(prevData => ({
      ...prevData,
      owner: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        console.error(`${file.name} is too large`);
        return false;
      }
      if (!file.type.startsWith("image/")) {
        console.error(`${file.name} is not an image`);
        return false;
      }
      return true;
    });

    const newImages = validFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setFormData(prevData => ({
      ...prevData,
      images: [...prevData.images, ...newImages],
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prevData => ({
      ...prevData,
      images: prevData.images.filter((_, i) => i !== index),
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Villa Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Villa Name</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required disabled={isSubmitting} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" value={formData.description} onChange={handleChange} required className="min-h-[100px]" disabled={isSubmitting} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="price">Price per Night</Label>
              <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange} required min="0" disabled={isSubmitting} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" name="capacity" type="number" value={formData.capacity} onChange={handleChange} required min="1" disabled={isSubmitting} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={handleStatusChange} disabled={isSubmitting}>
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
            <Label htmlFor="owner">Owner</Label>
            <Select value={formData.owner} onValueChange={handleOwnerChange} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(users) && users.length > 0 ? (
                  users.map(user => (
                    <SelectItem key={user._id} value={user.username}>
                      {user.username}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-users" disabled>
                    No owners available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Facilities</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="bathroom"
                  checked={formData.facilities?.bathroom || false}
                  onChange={() => handleFacilityChange("bathroom")}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  disabled={isSubmitting}
                />
                <Label htmlFor="bathroom" className="cursor-pointer">
                  Bathroom
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="wifi" checked={formData.facilities?.wifi || false} onChange={() => handleFacilityChange("wifi")} className="rounded border-gray-300 text-primary focus:ring-primary" disabled={isSubmitting} />
                <Label htmlFor="wifi" className="cursor-pointer">
                  WiFi
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="bed" checked={formData.facilities?.bed || false} onChange={() => handleFacilityChange("bed")} className="rounded border-gray-300 text-primary focus:ring-primary" disabled={isSubmitting} />
                <Label htmlFor="bed" className="cursor-pointer">
                  Bed
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="parking"
                  checked={formData.facilities?.parking || false}
                  onChange={() => handleFacilityChange("parking")}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  disabled={isSubmitting}
                />
                <Label htmlFor="parking" className="cursor-pointer">
                  Parking
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="kitchen"
                  checked={formData.facilities?.kitchen || false}
                  onChange={() => handleFacilityChange("kitchen")}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  disabled={isSubmitting}
                />
                <Label htmlFor="kitchen" className="cursor-pointer">
                  Kitchen
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="ac" checked={formData.facilities?.ac || false} onChange={() => handleFacilityChange("ac")} className="rounded border-gray-300 text-primary focus:ring-primary" disabled={isSubmitting} />
                <Label htmlFor="ac" className="cursor-pointer">
                  AC
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="tv" checked={formData.facilities?.tv || false} onChange={() => handleFacilityChange("tv")} className="rounded border-gray-300 text-primary focus:ring-primary" disabled={isSubmitting} />
                <Label htmlFor="tv" className="cursor-pointer">
                  TV
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="pool" checked={formData.facilities?.pool || false} onChange={() => handleFacilityChange("pool")} className="rounded border-gray-300 text-primary focus:ring-primary" disabled={isSubmitting} />
                <Label htmlFor="pool" className="cursor-pointer">
                  Pool
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Villa Images</Label>
            <div className="flex flex-wrap items-center gap-4">
              <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" multiple disabled={isSubmitting} />

              {formData.images.map((image, index) => (
                <div key={index} className="relative w-24 h-24">
                  <Image src={image.url || "/placeholder.svg"} alt={`Villa image ${index + 1}`} fill className="object-cover rounded-lg" />
                  <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => removeImage(index)} disabled={isSubmitting}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Label htmlFor="image-upload" className={`w-24 h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg hover:bg-gray-50 cursor-pointer ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}>
                <ImagePlus className="h-8 w-8 text-gray-400" />
                <span className="text-xs text-gray-600 text-center">Upload Images</span>
              </Label>

              <div className="flex-1">
                <p className="text-sm text-gray-600">Upload images of the villa (max 5MB each)</p>
                <p className="text-xs text-gray-400 mt-1">Supported formats: JPG, PNG, GIF</p>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Villa...
              </>
            ) : (
              "Update Villa"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
