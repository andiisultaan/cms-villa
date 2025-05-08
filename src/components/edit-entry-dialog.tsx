"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";

// Define the FinancialEntry interface to match the parent component
interface FinancialEntry {
  id: string;
  dateIn: string;
  dateOut: string;
  visitorName: string;
  personInCharge: string;
  deposite: number;
  villa: string;
  capacity: number;
  extraBed: number;
  priceExtraBed: number;
  villaPrice: number;
  ownerShare: number;
  managerShare: number;
  notes: string;
  paymentStatus: string;
}

interface EditEntryPanelProps {
  entry: FinancialEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: FinancialEntry) => void;
  villas: Array<{ _id: string; name: string }>;
}

export function EditEntryPanel({ entry, open, onOpenChange, onSave, villas }: EditEntryPanelProps) {
  const [formData, setFormData] = useState<FinancialEntry | null>(null);

  // Reset form data when entry changes
  useEffect(() => {
    if (entry) {
      setFormData({ ...entry });
    }
  }, [entry]);

  if (!formData) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Handle numeric fields
    if (["deposite", "capacity", "extraBed", "priceExtraBed", "villaPrice", "ownerShare", "managerShare"].includes(name)) {
      setFormData({
        ...formData,
        [name]: value === "" ? 0 : Number(value),
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Calculate shares when villa price changes
  const calculateShares = (price: number) => {
    const ownerShare = Math.round(price * 0.6);
    const managerShare = Math.round(price * 0.4);

    setFormData({
      ...formData,
      villaPrice: price,
      ownerShare,
      managerShare,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      // Ensure extraBed and priceExtraBed are numbers
      const updatedFormData = {
        ...formData,
        extraBed: Number(formData.extraBed) || 0,
        priceExtraBed: Number(formData.priceExtraBed) || 0,
      };
      onSave(updatedFormData);
    }
  };

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "yyyy-MM-dd");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <SheetHeader className="mb-4">
            <SheetTitle>Edit Financial Entry</SheetTitle>
            <SheetDescription>Make changes to the financial entry. Click save when you&apos;re done.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Date In */}
              <div className="space-y-2">
                <Label htmlFor="dateIn">Check In Date</Label>
                <Input
                  id="dateIn"
                  name="dateIn"
                  type="date"
                  value={formatDateForInput(formData.dateIn)}
                  onChange={e => {
                    const date = new Date(e.target.value);
                    setFormData({
                      ...formData,
                      dateIn: date.toISOString(),
                    });
                  }}
                  readOnly
                  className="bg-muted"
                />
              </div>

              {/* Date Out */}
              <div className="space-y-2">
                <Label htmlFor="dateOut">Check Out Date</Label>
                <Input
                  id="dateOut"
                  name="dateOut"
                  type="date"
                  value={formatDateForInput(formData.dateOut)}
                  onChange={e => {
                    const date = new Date(e.target.value);
                    setFormData({
                      ...formData,
                      dateOut: date.toISOString(),
                    });
                  }}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Visitor Name */}
            <div className="space-y-2">
              <Label htmlFor="visitorName">Visitor Name</Label>
              <Input id="visitorName" name="visitorName" value={formData.visitorName} onChange={handleInputChange} readOnly className="bg-muted" />
            </div>

            {/* Person In Charge */}
            <div className="space-y-2">
              <Label htmlFor="personInCharge">Person In Charge</Label>
              <Input id="personInCharge" name="personInCharge" value={formData.personInCharge} onChange={handleInputChange} readOnly className="bg-muted" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Villa */}
              <div className="space-y-2">
                <Label htmlFor="villa">Villa</Label>
                <Select value={formData.villa} onValueChange={value => handleSelectChange("villa", value)} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Select villa" />
                  </SelectTrigger>
                  <SelectContent>
                    {villas.map(villa => (
                      <SelectItem key={villa._id} value={villa.name}>
                        {villa.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select value={formData.paymentStatus} onValueChange={value => handleSelectChange("paymentStatus", value)} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Capacity */}
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" name="capacity" type="number" value={formData.capacity} onChange={handleInputChange} readOnly className="bg-muted" />
              </div>

              {/* Extra Bed */}
              <div className="space-y-2">
                <Label htmlFor="extraBed">Extra Bed</Label>
                <Input id="extraBed" name="extraBed" type="number" value={formData.extraBed} onChange={handleInputChange} />
              </div>

              {/* Price Extra Bed */}
              <div className="space-y-2">
                <Label htmlFor="priceExtraBed">Price Extra Bed</Label>
                <Input id="priceExtraBed" name="priceExtraBed" type="number" value={formData.priceExtraBed} onChange={handleInputChange} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Villa Price */}
              <div className="space-y-2">
                <Label htmlFor="villaPrice">Villa Price</Label>
                <Input
                  id="villaPrice"
                  name="villaPrice"
                  type="number"
                  value={formData.villaPrice}
                  onChange={e => {
                    const price = e.target.value === "" ? 0 : Number(e.target.value);
                    calculateShares(price);
                  }}
                  readOnly
                  className="bg-muted"
                />
              </div>

              {/* Owner Share */}
              <div className="space-y-2">
                <Label htmlFor="ownerShare">Owner Share (60%)</Label>
                <Input id="ownerShare" name="ownerShare" type="number" value={formData.ownerShare} onChange={handleInputChange} className="bg-muted" readOnly />
              </div>

              {/* Manager Share */}
              <div className="space-y-2">
                <Label htmlFor="managerShare">Manager Share (40%)</Label>
                <Input id="managerShare" name="managerShare" type="number" value={formData.managerShare} onChange={handleInputChange} className="bg-muted" readOnly />
              </div>
            </div>

            {/* Deposit */}
            <div className="space-y-2">
              <Label htmlFor="deposite">Deposit</Label>
              <Input id="deposite" name="deposite" type="number" value={formData.deposite} onChange={handleInputChange} readOnly className="bg-muted" />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Order ID / Notes</Label>
              <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={2} readOnly className="bg-muted" />
            </div>
          </div>
          <SheetFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
