import type React from "react";
import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SerializedVillaModel } from "@/db/models/villa";
import { X, ImagePlus } from "lucide-react";

interface EditVillaFormProps {
  villa: SerializedVillaModel;
  onSubmit: (updatedData: SerializedVillaModel) => void;
}

export default function EditVillaForm({ villa, onSubmit }: EditVillaFormProps) {
  const [formData, setFormData] = useState<SerializedVillaModel>(villa);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map(file => ({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" value={formData.description} onChange={handleChange} required className="min-h-[100px]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="price">Price per Night</Label>
              <Input id="price" name="price" type="text" value={formData.price} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" name="capacity" type="text" value={formData.capacity} onChange={handleChange} required />
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

              {formData.images.map((image, index) => (
                <div key={index} className="relative w-24 h-24">
                  <Image src={image.url || "/placeholder.svg"} alt={`Villa image ${index + 1}`} fill className="object-cover rounded-lg" />
                  <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => removeImage(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Label htmlFor="image-upload" className="w-24 h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg hover:bg-gray-50 cursor-pointer">
                <ImagePlus className="h-8 w-8 text-gray-400" />
                <span className="text-xs text-gray-600 text-center">Upload Images</span>
              </Label>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Update Villa
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
