'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useDashboardTitle } from '@/app/dashboard/layout';
import { MemoCondition, ApprovalRoute } from '@/types';
import {
  subscribeToConditions,
  createCondition,
  updateCondition,
  deleteCondition,
  } from '@/lib/conditions';

export default function ConditionsPage() {
  const { setTitle } = useDashboardTitle();
  const [conditions, setConditions] = useState<MemoCondition[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<MemoCondition | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    matchType: 'department' as MemoCondition['matchType'],
    matchValue: '',
    approvalRoute: [] as ApprovalRoute[],
    isActive: true,
  });

  useEffect(() => { setTitle('จัดการ Condition'); }, [setTitle]);

  useEffect(() => {
    const unsubscribe = subscribeToConditions((data) => {
      setConditions(data);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleCreate = () => {
    setEditingCondition(null);
    setFormData({
      name: '',
      description: '',
      matchType: 'department',
      matchValue: '',
      approvalRoute: [],
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (condition: MemoCondition) => {
    setEditingCondition(condition);
    setFormData({
      name: condition.name,
      description: condition.description || '',
      matchType: condition.matchType,
      matchValue: condition.matchValue,
      approvalRoute: condition.approvalRoute || [],
      isActive: condition.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingCondition) {
      await updateCondition(editingCondition.id, formData);
    } else {
      await createCondition(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('คุณต้องการลบเงื่อนไขนี้ใช่หรือไม่?')) {
      await deleteCondition(id);
    }
  };

  const addApprovalLevel = () => {
    setFormData({
      ...formData,
      approvalRoute: [
        ...formData.approvalRoute,
        {
          level: formData.approvalRoute.length + 1,
          approvalLevel: 'GM',
          required: true,
        },
      ],
    });
  };

  const updateApprovalLevel = (index: number, field: keyof ApprovalRoute, value: string | boolean) => {
    const updated = [...formData.approvalRoute];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, approvalRoute: updated });
  };

  const removeApprovalLevel = (index: number) => {
    const updated = formData.approvalRoute.filter((_, i) => i !== index);
    setFormData({ ...formData, approvalRoute: updated });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'job_description': return 'ตามลักษณะงาน';
      case 'department': return 'ตามแผนก';
      case 'customer': return 'ตามลูกค้า';
      case 'supplier': return 'ตามซัพพลายเออร์';
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          กำหนดเงื่อนไขและเส้นทางอนุมัติสำหรับ Memo
        </p>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          สร้าง Condition ใหม่
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        {conditions.length === 0 ? (
          <div className="p-8 text-center text-slate-600">ยังไม่มี Condition</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead className="w-32">ประเภท</TableHead>
                <TableHead>แผนก</TableHead>
                <TableHead className="w-24">ระดับ</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conditions.map((condition) => (
                <TableRow key={condition.id}>
                  <TableCell className="font-medium">{condition.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getTypeLabel(condition.matchType)}</Badge>
                  </TableCell>
                  <TableCell>{condition.matchValue}</TableCell>
                  <TableCell>{condition.approvalRoute?.length || 0} ระดับ</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(condition)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(condition.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCondition ? 'แก้ไข Condition' : 'สร้าง Condition ใหม่'}</DialogTitle>
            <DialogDescription>กำหนดเงื่อนไขและเส้นทางอนุมัติ</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>ชื่อ *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น จัดซื้อแผนกไอที"
              />
            </div>
            <div className="grid gap-2">
              <Label>คำอธิบาย</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>ประเภทเงื่อนไข</Label>
              <Select
                value={formData.matchType}
                onValueChange={(v) => setFormData({ ...formData, matchType: v as MemoCondition['matchType'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job_description">ตามลักษณะงาน</SelectItem>
                  <SelectItem value="department">ตามแผนก</SelectItem>
                  <SelectItem value="customer">ตามลูกค้า</SelectItem>
                  <SelectItem value="supplier">ตามซัพพลายเออร์</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>แผนก</Label>
              {formData.matchType === 'department' ? (
                <Input
                  value={formData.matchValue}
                  onChange={(e) => setFormData({ ...formData, matchValue: e.target.value })}
                  placeholder={formData.matchType === 'department' ? 'กรอกชื่อแผนก' : 'เช่น ลูกค้า A, ซัพพลายเออร์ B'}
                />
              ) : (
                <Input
                  value={formData.matchValue}
                  onChange={(e) => setFormData({ ...formData, matchValue: e.target.value })}
                  placeholder="เช่น ลูกค้า A, ซัพพลายเออร์ B"
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>เส้นทางอนุมัติ</Label>
                <Button type="button" variant="outline" size="sm" onClick={addApprovalLevel}>
                  <Plus className="mr-1 h-3 w-3" />
                  เพิ่มระดับ
                </Button>
              </div>
              {formData.approvalRoute.map((route, index) => (
                <div key={index} className="flex items-center space-x-2 rounded border p-2">
                  <span className="text-sm font-medium w-8 text-slate-900">ระดับ {index + 1}</span>
                  <Select
                    value={route.approvalLevel}
                    onValueChange={(v) => updateApprovalLevel(index, 'approvalLevel', v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="เลือกระดับ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GM">GM</SelectItem>
                      <SelectItem value="MD">MD</SelectItem>
                      <SelectItem value="CEO">CEO</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-500"
                    onClick={() => removeApprovalLevel(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={!formData.name}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
