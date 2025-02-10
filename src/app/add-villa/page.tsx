"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/navigation";

export default function AddVilla() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send a POST request to your API
    console.log("New villa:", { name, location, price: Number(price) });
    // Reset form and navigate back to home page
    setName("");
    setLocation("");
    setPrice("");
    router.push("/");
  };

  return (
    <>
      <div className="flex h-screen bg-gray-100">
        <Navigation />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Add New Villa</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Villa Name</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" value={location} onChange={e => setLocation(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="price">Price per Night</Label>
                    <Input id="price" type="number" value={price} onChange={e => setPrice(e.target.value)} required />
                  </div>
                  <Button type="submit">Add Villa</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}
