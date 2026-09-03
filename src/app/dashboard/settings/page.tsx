'use client';

import React, { useState, useEffect } from 'react';
import { useDashboardTitle } from '@/app/dashboard/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2, Mail, Clock, FileText, Users, Send, Loader2, CheckCircle, XCircle, Copy, ChevronLeft, ChevronUp, ChevronDown, Settings, Activity, Settings2, Pencil } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getSettings, saveSettings } from '@/lib/settings';
import { subscribeToTemplates, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate } from '@/lib/templates';
import { subscribeToUsers, createUser, updateUser, deleteUser } from '@/lib/users';
import { subscribeToSyslogs } from '@/lib/syslogs';
import { logSettingUpdated } from '@/lib/event-logs';
import { GlobalSettings, MemoTemplate, User, MemoField, MemoFieldType, Syslog } from '@/types';
import { SectionConfigEditor, SECTION_TYPES } from '@/components/section-editors';
import { SectionRenderer } from '@/components/memo-sections';

export default function SettingsPage() {
  const { user } = useAuth();
  const { setTitle } = useDashboardTitle();
  const [settings, setSettings] = useState<GlobalSettings>({
    smtp: { host: '', port: 587, secure: false, user: '', password: '', fromEmail: '', fromName: 'MemoHub' },
    deadlineDays: 7,
    positionOptions: ['CEO', 'หัวหน้าแผนก', 'ซัพพลายเออร์', 'ลูกค้า', 'ร้านค้า'],
    departmentOptions: ['ไอที', 'บัญชี', 'เซล'],
  });
  const [templates, setTemplates] = useState<MemoTemplate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);

  // Template dialog (name + description only)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MemoTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', description: '' });

  // Section management view
  const [editingSectionsFor, setEditingSectionsFor] = useState<MemoTemplate | null>(null);
  const [sectionFields, setSectionFields] = useState<MemoField[]>([]);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);

  // User dialog
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    email: '',
    displayName: '',
    role: 'user' as User['role'],
    department: '',
    position: '',
    isApprover: false,
  });

  // Test email dialog
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Syslog state
  const [syslogs, setSyslogs] = useState<Syslog[]>([]);

  // Master data state
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [newItemField, setNewItemField] = useState<'position' | 'department'>('position');
  const [newItemValue, setNewItemValue] = useState('');

  useEffect(() => { setTitle('การตั้งค่า'); }, [setTitle]);

  useEffect(() => {
    const loadData = async () => {
      const s = await getSettings();
      setSettings(s);
    };
    loadData();

    const unsubTemplates = subscribeToTemplates(setTemplates);
    const unsubUsers = subscribeToUsers(setUsers);
    const unsubSyslogs = subscribeToSyslogs(setSyslogs);

    return () => {
      unsubTemplates();
      unsubUsers();
      unsubSyslogs();
    };
  }, []);

  const handleSaveSMTP = async () => {
    if (!settings || !user) return;
    setSaving(true);
    try {
      const oldSettings = await getSettings();
      await saveSettings({ smtp: settings.smtp }, user.id);
      await logSettingUpdated(user.id, user.displayName, 'SMTP', oldSettings.smtp, settings.smtp);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!settings || !testEmailTo) return;
    setTestEmailSending(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp: settings.smtp, to: testEmailTo }),
      });
      const data = await res.json();
      setTestEmailResult(data);
    } catch (err) {
      setTestEmailResult({ success: false, error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
    } finally {
      setTestEmailSending(false);
    }
  };

  const handleSaveDeadline = async () => {
    if (!settings || !user) return;
    setSaving(true);
    try {
      const oldSettings = await getSettings();
      await saveSettings({ deadlineDays: settings.deadlineDays }, user.id);
      await logSettingUpdated(user.id, user.displayName, 'Deadline', oldSettings.deadlineDays, settings.deadlineDays);
    } finally {
      setSaving(false);
    }
  };

  // Template CRUD (name + description only)
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: '', description: '' });
    setIsTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: MemoTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
    });
    setIsTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, templateForm);
    } else {
      await createTemplate({ ...templateForm, fields: [], isActive: true });
    }
    setIsTemplateDialogOpen(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('คุณต้องการลบเทมเพลตนี้ใช่หรือไม่?')) {
      await deleteTemplate(id);
    }
  };

  const handleDuplicateTemplate = async (template: MemoTemplate) => {
    const newName = prompt('ชื่อเทมเพลตใหม่:', `${template.name || 'เทมเพลต'} (คัดลอก)`);
    if (newName) {
      await duplicateTemplate(template.id, newName);
    }
  };

  // Section management
  const handleOpenSections = (template: MemoTemplate) => {
    setEditingSectionsFor(template);
    setSectionFields(template.fields ? JSON.parse(JSON.stringify(template.fields)) : []);
  };

  const handleSaveSections = async () => {
    if (!editingSectionsFor) return;
    setSectionSaving(true);
    try {
      await updateTemplate(editingSectionsFor.id, { fields: sectionFields });
      setEditingSectionsFor(null);
    } finally {
      setSectionSaving(false);
    }
  };

  const addSection = (type: MemoFieldType) => {
    const newField: MemoField = {
      id: Date.now().toString(),
      name: `section_${Date.now()}`,
      label: '',
      type,
      required: false,
      fieldConfig: {},
    };

    if (type === 'checkbox_group') {
      newField.fieldConfig = { options: ['เพื่อทราบ', 'เพื่อขอให้ดำเนินการ', 'ลูกค้ารายใหม่', 'เพื่อพิจารณา', 'เพื่อขออนุมัติ', 'ลูกค้ารายเก่า'] };
      newField.label = 'จุดประสงค์';
    } else if (type === 'dropdown_select') {
      newField.fieldConfig = { options: ['เพื่อทราบ', 'เพื่อขอให้ดำเนินการ', 'ลูกค้ารายใหม่', 'เพื่อพิจารณา', 'เพื่อขออนุมัติ', 'ลูกค้ารายเก่า'], placeholder: 'เลือกจุดประสงค์' };
      newField.label = 'จุดประสงค์';
    } else if (type === 'memo_type') {
      newField.fieldConfig = { options: [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }] };
      newField.label = 'ประเภท Memo';
    } else if (type === 'form_row') {
      newField.fieldConfig = {
        fields: [
          { name: 'subject', label: 'เรื่อง', type: 'text' },
          { name: 'date', label: 'วันที่', type: 'date' },
          { name: 'to', label: 'เรียน', type: 'text' },
          { name: 'quotationNo', label: 'เลขที่ใบเสนอราคา', type: 'text' },
          { name: 'customerName', label: 'ชื่อลูกค้า', type: 'text' },
          { name: 'jobNo', label: 'เลข JOB (ถ้ามี)', type: 'text' },
        ],
      };
      newField.label = 'ฟอร์ม';
    } else if (type === 'body_text') {
      newField.fieldConfig = { lines: 12 };
      newField.label = 'เนื้อหา';
    } else if (type === 'approval_grid') {
      newField.fieldConfig = {
        columns: [
          { title: 'ผู้ขออนุมัติ', subtitle: '' },
          { title: 'ตรวจสอบโดยหัวหน้าแผนก', subtitle: '' },
          { title: 'อนุมัติ', subtitle: '' },
        ],
        showTime: true,
      };
      newField.label = 'ลงชื่ออนุมัติ';
    } else if (type === 'section_title') {
      newField.label = 'MEMO';
    } else if (type === 'company_header') {
      newField.label = 'ข้อมูลบริษัท';
      newField.fieldConfig = {
        logoUrl: 'https://workflow.digitalfactory.co.th/logo/df_full_logo-01.png',
        companyName: 'บริษัท ดิจิทัล แฟคตอรี่ จำกัด (สำนักงานใหญ่)',
        addressLines: [
          'อาคารโอลิมเปียไทยทาวเวอร์ ชั้น 4 เลขที่ 444',
          'ถนนรัชดาภิเษก แขวงสามเสนนอก',
          'เขตห้วยขวาง กรุงเทพมหานคร 10310',
        ],
      };
    }

    setSectionFields([...sectionFields, newField]);
  };

  const updateSection = (index: number, updates: Partial<MemoField>) => {
    const updated = [...sectionFields];
    updated[index] = { ...updated[index], ...updates };
    setSectionFields(updated);
  };

  const removeSection = (index: number) => {
    setSectionFields(sectionFields.filter((_, i) => i !== index));
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const updated = [...sectionFields];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setSectionFields(updated);
  };

  const moveSectionDown = (index: number) => {
    if (index === sectionFields.length - 1) return;
    const updated = [...sectionFields];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setSectionFields(updated);
  };

  // User CRUD
  const handleCreateUser = () => {
    setEditingUser(null);
    setUserForm({ username: '', password: '', email: '', displayName: '', role: 'user', department: '', position: '', isApprover: false });
    setIsUserDialogOpen(true);
  };

  const handleEditUser = (u: User) => {
    setEditingUser(u);
    setUserForm({
      username: u.username || '',
      password: '',
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      department: u.department || '',
      position: u.position || '',
      isApprover: u.isApprover || false,
    });
    setIsUserDialogOpen(true);
  };

  const [userFormError, setUserFormError] = useState('');

  const handleSaveUser = async () => {
    setUserFormError('');

    if (!editingUser) {
      const duplicateUsername = users.find((u) => u.username === userForm.username);
      if (duplicateUsername) {
        setUserFormError('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
        return;
      }
    } else if (editingUser.username !== userForm.username) {
      const duplicateUsername = users.find((u) => u.username === userForm.username && u.id !== editingUser.id);
      if (duplicateUsername) {
        setUserFormError('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
        return;
      }
    }

    const adminCount = users.filter((u) => u.role === 'admin').length;
    const isCreatingAdmin = !editingUser && userForm.role === 'admin';
    const isChangingToAdmin = editingUser && editingUser.role !== 'admin' && userForm.role === 'admin';
    if ((isCreatingAdmin || isChangingToAdmin) && adminCount >= 1) {
      setUserFormError('มี Admin ได้เพียง 1 คนเท่านั้น');
      return;
    }

    const userData = { ...userForm };
    if (editingUser) {
      await updateUser(editingUser.id, userData);
    } else {
      await createUser({ ...userData });
    }
    setIsUserDialogOpen(false);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('คุณต้องการลบผู้ใช้นี้ใช่หรือไม่?')) {
      await deleteUser(id);
    }
  };

  const handleToggleApprover = async (u: User) => {
    await updateUser(u.id, { isApprover: !u.isApprover });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return <Badge>Admin</Badge>;
      default: return <Badge variant="outline">User</Badge>;
    }
  };

  // Master data handlers
  const handleSaveListItem = async () => {
    if (!newItemValue.trim() || !settings) return;
    const field = newItemField === 'position' ? 'positionOptions' : 'departmentOptions';
    const currentList = settings[field] || [];

    let newList: string[];
    if (editingItemIndex !== null) {
      newList = [...currentList];
      newList[editingItemIndex] = newItemValue.trim();
    } else {
      if (currentList.includes(newItemValue.trim())) return;
      newList = [...currentList, newItemValue.trim()];
    }

    const updated = { ...settings, [field]: newList };
    await saveSettings(updated, user?.id || 'system');
    setSettings(updated);
    setIsNewItemDialogOpen(false);
    setEditingItemIndex(null);
    setNewItemValue('');
  };

  const handleEditListItem = (field: 'position' | 'department', index: number) => {
    const list = field === 'position' ? settings?.positionOptions : settings?.departmentOptions;
    setNewItemField(field);
    setNewItemValue(list?.[index] || '');
    setEditingItemIndex(index);
    setIsNewItemDialogOpen(true);
  };

  const handleDeleteListItem = async (field: 'position' | 'department', index: number) => {
    if (!settings) return;
    const settingField = field === 'position' ? 'positionOptions' : 'departmentOptions';
    const currentList = settings[settingField] || [];
    const newList = currentList.filter((_, i) => i !== index);
    const updated = { ...settings, [settingField]: newList };
    await saveSettings(updated, user?.id || 'system');
    setSettings(updated);
  };

  return (
    <>
      <Tabs defaultValue="syslog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="syslog" className="flex items-center space-x-2"><Activity className="h-4 w-4" /><span>Syslog</span></TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2"><Users className="h-4 w-4" /><span>ผู้ใช้</span></TabsTrigger>
          <TabsTrigger value="master-data" className="flex items-center space-x-2"><Settings2 className="h-4 w-4" /><span>ข้อมูลหลัก</span></TabsTrigger>
          <TabsTrigger value="smtp" className="flex items-center space-x-2"><Mail className="h-4 w-4" /><span>ตั้งค่าอีเมล</span></TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center space-x-2"><FileText className="h-4 w-4" /><span>เทมเพลต</span></TabsTrigger>
          <TabsTrigger value="deadline" className="flex items-center space-x-2"><Clock className="h-4 w-4" /><span>Deadline</span></TabsTrigger>
        </TabsList>

        {/* Syslog */}
        <TabsContent value="syslog">
          <Card>
            <CardHeader>
              <CardTitle>System Log</CardTitle>
              <CardDescription>บันทึกการทำงานของระบบ (Server, Client, Middleware)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">วันที่/เวลา</TableHead>
                      <TableHead className="w-[80px]">Level</TableHead>
                      <TableHead className="w-[100px]">Category</TableHead>
                      <TableHead>ข้อความ</TableHead>
                      <TableHead className="w-[120px]">ผู้ใช้</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syslogs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-slate-600 py-8">ยังไม่มี Syslog</TableCell></TableRow>
                    ) : (
                      syslogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">{log.timestamp instanceof Date ? log.timestamp.toLocaleString('th-TH') : '-'}</TableCell>
                          <TableCell>
                            <Badge variant={log.level === 'error' ? 'destructive' : log.level === 'warning' ? 'secondary' : 'default'}>
                              {log.level}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.category}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.message}</TableCell>
                          <TableCell className="text-sm">{log.userName || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMTP */}
        <TabsContent value="smtp">
          <Card>
            <CardHeader><CardTitle>ตั้งค่า SMTP Server</CardTitle><CardDescription>ตั้งค่าข้อมูล SMTP สำหรับส่งอีเมลแจ้งเตือน</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>SMTP Host</Label><Input value={settings?.smtp.host || ''} onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, host: e.target.value } })} /></div>
                <div className="space-y-2"><Label>SMTP Port</Label><Input type="number" value={settings?.smtp.port || 587} onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, port: parseInt(e.target.value) } })} /></div>
              </div>
              <div className="flex items-center space-x-3">
                <Label className="cursor-pointer select-none">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={settings?.smtp.secure || false}
                      onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, secure: e.target.checked } })}
                    />
                    <span>ใช้ SSL/TLS</span>
                  </div>
                </Label>
                <span className="text-sm text-slate-500">(Port 465 = SSL, Port 587 = STARTTLS)</span>
              </div>
              <div className="space-y-2"><Label>ชื่อผู้ใช้</Label><Input value={settings?.smtp.user || ''} onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, user: e.target.value } })} /></div>
              <div className="space-y-2"><Label>รหัสผ่าน</Label><Input type="password" value={settings?.smtp.password || ''} onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, password: e.target.value } })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>From Email</Label><Input value={settings?.smtp.fromEmail || ''} onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, fromEmail: e.target.value } })} /></div>
                <div className="space-y-2"><Label>From Name</Label><Input value={settings?.smtp.fromName || ''} onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, fromName: e.target.value } })} /></div>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={handleSaveSMTP} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
                <Button variant="outline" onClick={() => { setTestEmailResult(null); setTestEmailTo(''); setIsTestEmailDialogOpen(true); }}><Send className="mr-2 h-4 w-4" />ทดสอบส่งอีเมล</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deadline */}
        <TabsContent value="deadline">
          <Card>
            <CardHeader><CardTitle>ตั้งค่า Deadline</CardTitle><CardDescription>กำหนดระยะเวลาสูงสุดของ Memo ก่อนถูกยกเลิกอัตโนมัติ</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>จำนวนวัน (นับจากวันที่สร้าง)</Label>
                <Input type="number" min="1" max="365" value={settings?.deadlineDays || 7} onChange={(e) => setSettings({ ...settings!, deadlineDays: parseInt(e.target.value) })} />
                <p className="text-sm text-slate-600">Memo จะถูกยกเลิกอัตโนมัติหากไม่ได้รับการอนุมัติภายใน {settings?.deadlineDays || 7} วัน</p>
              </div>
              <Button onClick={handleSaveDeadline} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          {editingSectionsFor ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setEditingSectionsFor(null)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle>จัดการ Sections</CardTitle>
                    <CardDescription>{editingSectionsFor.name || 'เทมเพลตไม่มีชื่อ'} — {sectionFields.length} sections</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setEditingSectionsFor(null)}>ยกเลิก</Button>
                  <Button onClick={handleSaveSections} disabled={sectionSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {sectionSaving ? 'กำลังบันทึก...' : 'บันทึก Sections'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {SECTION_TYPES.map((item) => (
                    <Button
                      key={item.value}
                      variant="outline"
                      size="sm"
                      onClick={() => addSection(item.value)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {item.label}
                    </Button>
                  ))}
                </div>

                {sectionFields.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed p-8 text-center text-slate-500">
                    <p className="text-sm">ยังไม่มี Section — เลือกประเภท Section ด้านบนเพื่อเพิ่ม</p>
                  </div>
                )}

                <div className="space-y-3">
                  {sectionFields.map((field, i) => (
                    <div key={field.id} className="relative group">
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-md shadow-sm border p-1">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSectionUp(i)} disabled={i === 0}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSectionDown(i)} disabled={i === sectionFields.length - 1}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => removeSection(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSectionIndex(i)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                      <SectionRenderer
                        field={field}
                        readonly
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="list">
              <TabsList>
                <TabsTrigger value="list">เทมเพลต</TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div><CardTitle>เทมเพลต Memo</CardTitle><CardDescription>จัดการเทมเพลตสำหรับสร้าง Memo</CardDescription></div>
                    <Button onClick={handleCreateTemplate}><Plus className="mr-2 h-4 w-4" />สร้างเทมเพลตใหม่</Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>ประเภท Memo</TableHead><TableHead>Sections</TableHead><TableHead className="w-40"></TableHead></TableRow></TableHeader>
                      <TableBody>
                        {templates.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.name || <span className="text-slate-400 italic">ไม่มีชื่อ</span>}</TableCell>
                            <TableCell>{t.fields?.length || 0} sections</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEditTemplate(t)} title="แก้ไขข้อมูล">
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenSections(t)} title="จัดการ Sections">
                                  <Settings className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDuplicateTemplate(t)} title="คัดลอก">
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteTemplate(t.id)} title="ลบ">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>จัดการผู้ใช้</CardTitle><CardDescription>เพิ่ม/แก้ไข/ลบ ผู้ใช้งานในระบบ</CardDescription></div>
              <Button onClick={handleCreateUser}><Plus className="mr-2 h-4 w-4" />เพิ่มผู้ใช้ใหม่</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>ชื่อ</TableHead><TableHead>อีเมล</TableHead><TableHead>บทบาท</TableHead><TableHead>ตำแหน่ง</TableHead><TableHead>แผนก</TableHead><TableHead className="text-center">ผู้อนุมัติ</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.displayName}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{getRoleLabel(u.role)}</TableCell>
                      <TableCell>{u.position || '-'}</TableCell>
                      <TableCell>{u.department || '-'}</TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleApprover(u)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${u.isApprover ? 'bg-green-600' : 'bg-slate-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.isApprover ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditUser(u)}><FileText className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteUser(u.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Master Data - Positions & Departments */}
        <TabsContent value="master-data">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Positions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>ตำแหน่ง</CardTitle><CardDescription>จัดการรายการตำแหน่ง</CardDescription></div>
                <Button size="sm" onClick={() => { setNewItemField('position'); setNewItemValue(''); setIsNewItemDialogOpen(true); }}><Plus className="mr-1 h-3 w-3" />เพิ่ม</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(settings?.positionOptions || []).map((opt, i) => (
                    <div key={i} className="flex items-center justify-between border rounded-md px-3 py-2">
                      <span className="text-sm">{opt}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditListItem('position', i)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteListItem('position', i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                  {(!settings?.positionOptions || settings.positionOptions.length === 0) && (
                    <p className="text-sm text-slate-500 text-center py-4">ยังไม่มีข้อมูล</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Departments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>แผนก</CardTitle><CardDescription>จัดการรายการแผนก</CardDescription></div>
                <Button size="sm" onClick={() => { setNewItemField('department'); setNewItemValue(''); setIsNewItemDialogOpen(true); }}><Plus className="mr-1 h-3 w-3" />เพิ่ม</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(settings?.departmentOptions || []).map((opt, i) => (
                    <div key={i} className="flex items-center justify-between border rounded-md px-3 py-2">
                      <span className="text-sm">{opt}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditListItem('department', i)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteListItem('department', i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                  {(!settings?.departmentOptions || settings.departmentOptions.length === 0) && (
                    <p className="text-sm text-slate-500 text-center py-4">ยังไม่มีข้อมูล</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Message Templates */}
      </Tabs>

      {/* Template Dialog (name + description only) */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'แก้ไขประเภท Memo' : 'สร้างประเภท Memo ใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>ชื่อประเภท Memo</Label>
              <Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="กรอกชื่อประเภท Memo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSaveTemplate}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {userFormError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-md">{userFormError}</div>
            )}
            <div className="grid gap-2"><Label>ชื่อ นามสกุล *</Label><Input value={userForm.displayName} onChange={(e) => setUserForm({ ...userForm, displayName: e.target.value })} placeholder="กรอกชื่อ นามสกุล" /></div>
            <div className="grid gap-2"><Label>ชื่อผู้ใช้ *</Label><Input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} /></div>
            <div className="grid gap-2"><Label>รหัสผ่าน {!editingUser && '*'}</Label><Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder={editingUser ? 'ปล่อยว่างหากไม่ต้องการเปลี่ยน' : ''} /></div>
            <div className="grid gap-2"><Label>อีเมล *</Label><Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>บทบาท</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v as User['role'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>ตำแหน่ง</Label>
              <Select value={userForm.position} onValueChange={(v) => setUserForm({ ...userForm, position: v })}>
                <SelectTrigger><SelectValue placeholder="เลือกตำแหน่ง" /></SelectTrigger>
                <SelectContent>
                  {(settings?.positionOptions || []).map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>แผนก</Label>
              <Select value={userForm.department} onValueChange={(v) => setUserForm({ ...userForm, department: v })}>
                <SelectTrigger><SelectValue placeholder="เลือกแผนก" /></SelectTrigger>
                <SelectContent>
                  {(settings?.departmentOptions || []).map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label>เป็นผู้อนุมัติ</Label>
              <button
                type="button"
                onClick={() => setUserForm({ ...userForm, isApprover: !userForm.isApprover })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${userForm.isApprover ? 'bg-green-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${userForm.isApprover ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSaveUser} disabled={!userForm.email || !userForm.displayName}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit List Item Dialog */}
      <Dialog open={isNewItemDialogOpen} onOpenChange={(open) => { setIsNewItemDialogOpen(open); if (!open) { setEditingItemIndex(null); setNewItemValue(''); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingItemIndex !== null ? 'แก้ไข' : 'เพิ่ม'}{newItemField === 'position' ? 'ตำแหน่ง' : 'แผนก'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>ชื่อ</Label>
              <Input value={newItemValue} onChange={(e) => setNewItemValue(e.target.value)} placeholder={`กรอกชื่อ${newItemField === 'position' ? 'ตำแหน่ง' : 'แผนก'}`} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsNewItemDialogOpen(false); setEditingItemIndex(null); setNewItemValue(''); }}>ยกเลิก</Button>
            <Button onClick={handleSaveListItem} disabled={!newItemValue.trim()}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={isTestEmailDialogOpen} onOpenChange={setIsTestEmailDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>ทดสอบส่งอีเมล</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>อีเมลผู้รับ</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={testEmailTo}
                onChange={(e) => { setTestEmailTo(e.target.value); setTestEmailResult(null); }}
                disabled={testEmailSending}
              />
            </div>
            {testEmailResult && (
              <div className={`flex items-start space-x-2 rounded-lg p-3 text-sm ${testEmailResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {testEmailResult.success ? (
                  <><CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>ส่งอีเมลสำเร็จ! ตรวจสอบกล่องจดหมายของผู้รับ</span></>
                ) : (
                  <><XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>ส่งไม่สำเร็จ: {testEmailResult.error}</span></>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestEmailDialogOpen(false)} disabled={testEmailSending}>ปิด</Button>
            <Button onClick={handleTestEmail} disabled={!testEmailTo || testEmailSending}>
              {testEmailSending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังส่ง...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" />ส่งทดสอบ</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Config Editor Dialog */}
      <Dialog open={editingSectionIndex !== null} onOpenChange={() => setEditingSectionIndex(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>แก้ไข Section</DialogTitle>
          </DialogHeader>
          {editingSectionIndex !== null && sectionFields[editingSectionIndex] && (
            <div className="space-y-4">
              <div>
                <Label>ประเภท</Label>
                <div className="mt-1">
                  <Badge variant="secondary">
                    {SECTION_TYPES.find(s => s.value === sectionFields[editingSectionIndex].type)?.label || sectionFields[editingSectionIndex].type}
                  </Badge>
                </div>
              </div>
              <SectionConfigEditor
                field={sectionFields[editingSectionIndex]}
                onUpdate={(updates) => updateSection(editingSectionIndex, updates)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSectionIndex(null)}>ปิด</Button>
            <Button onClick={() => setEditingSectionIndex(null)}>ตกลง</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
