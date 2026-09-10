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
import { Plus, Save, Trash2, Mail, Clock, FileText, Users, Send, Loader2, CheckCircle, XCircle, Copy, ChevronLeft, ChevronUp, ChevronDown, Settings, Activity, Settings2, Pencil, WifiOff, RefreshCw } from 'lucide-react';
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
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; error?: string; code?: string } | null>(null);

  // Server status
  const [serverStatus, setServerStatus] = useState('');

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

    const smtp = settings.smtp;
    if (!smtp.host || !smtp.user || !smtp.password) {
      setTestEmailResult({ success: false, error: 'กรุณากรอกข้อมูล SMTP (Host / Username / Password) ให้ครบก่อน', code: 'EVALIDATE' });
      return;
    }

    setTestEmailSending(true);
    setTestEmailResult(null);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { smtp }, updatedBy: user?.id || 'system' }),
      });
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp, to: testEmailTo }),
      });
      const data = await res.json();
      setTestEmailResult({ success: data.ok, error: data.message, code: data.code });
    } catch {
      setTestEmailResult({ success: false, error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', code: 'EUNKNOWN' });
    } finally {
      setTestEmailSending(false);
    }
  };

  const handleCheckServer = async () => {
    setServerStatus('ตรวจสอบ...');
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.ok) {
        setServerStatus('เชื่อมต่อ server สำเร็จ — พร้อมส่งอีเมล');
      } else {
        setServerStatus('Server ตอบกลับไม่ปกติ');
      }
    } catch {
      setServerStatus('ไม่สามารถเชื่อมต่อ server ได้ — ตรวจสอบว่า API ทำงานปกติ');
    }
  };

  const handleSaveEmailFormat = async () => {
    if (!settings || !user) return;
    setSaving(true);
    try {
      const oldSettings = await getSettings();
      await saveSettings({ emailFormat: settings.emailFormat }, user.id);
      await logSettingUpdated(user.id, user.displayName, 'EmailFormat', oldSettings.emailFormat, settings.emailFormat);
    } finally {
      setSaving(false);
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

  // Form field editing state
  const [editingFieldTemplateId, setEditingFieldTemplateId] = useState<string | null>(null);
  const [editingFormFields, setEditingFormFields] = useState<Array<{ name: string; label: string; type: string; options?: string[]; placeholder?: string; required?: boolean }>>([]);
  const [fieldSaving, setFieldSaving] = useState(false);

  const handleEditFormFields = (template: MemoTemplate) => {
    const formRow = (template.fields || []).find((f) => f.type === 'form_row');
    const config = (formRow?.fieldConfig || {}) as { fields?: Array<{ name: string; label: string; type: string; options?: string[] | string; placeholder?: string }> };
    const rawFields = config.fields || [];
    const normalized = rawFields.map((f) => ({
      ...f,
      options: Array.isArray(f.options) ? f.options : typeof f.options === 'string' ? f.options.split(',').map((s) => s.trim()).filter(Boolean) : [],
    }));
    setEditingFormFields(normalized);
    setEditingFieldTemplateId(template.id);
  };

  const handleSaveFormFields = async () => {
    if (!editingFieldTemplateId) return;
    setFieldSaving(true);
    try {
      const template = templates.find((t) => t.id === editingFieldTemplateId);
      if (!template) return;
      const fields = template.fields ? JSON.parse(JSON.stringify(template.fields)) : [];
      const formRowIndex = fields.findIndex((f: MemoField) => f.type === 'form_row');
      if (formRowIndex >= 0) {
        fields[formRowIndex].fieldConfig = { fields: editingFormFields };
      } else {
        fields.push({
          id: 'form_row_1',
          name: 'form_data',
          label: 'ฟอร์ม',
          type: 'form_row',
          required: false,
          fieldConfig: { fields: editingFormFields },
        });
      }
      await updateTemplate(editingFieldTemplateId, { fields });
      setEditingFieldTemplateId(null);
    } finally {
      setFieldSaving(false);
    }
  };

  const addFormField = () => {
    setEditingFormFields([...editingFormFields, { name: `field_${Date.now()}`, label: '', type: 'text', options: [] }]);
  };

  const updateFormField = (index: number, updates: Partial<{ name: string; label: string; type: string; options?: string[]; placeholder?: string; required?: boolean }>) => {
    const updated = [...editingFormFields];
    updated[index] = { ...updated[index], ...updates };
    setEditingFormFields(updated);
  };

  const removeFormField = (index: number) => {
    setEditingFormFields(editingFormFields.filter((_, i) => i !== index));
  };

  const moveFormFieldUp = (index: number) => {
    if (index === 0) return;
    const updated = [...editingFormFields];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setEditingFormFields(updated);
  };

  const moveFormFieldDown = (index: number) => {
    if (index >= editingFormFields.length - 1) return;
    const updated = [...editingFormFields];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setEditingFormFields(updated);
  };

  // Company header editing state
  const [editingHeaderTemplateId, setEditingHeaderTemplateId] = useState<string | null>(null);
  const [editingHeader, setEditingHeader] = useState({
    logoUrl: '',
    companyName: '',
    companyNameTh: '',
    memorandumTitle: '',
    addressText: '',
    memoNoLabel: '',
    refNoLabel: '',
    quotationLabel: '',
    jobNoLabel: '',
    dateLabel: '',
  });
  const [headerSaving, setHeaderSaving] = useState(false);

  const handleEditHeader = (template: MemoTemplate) => {
    const headerField = (template.fields || []).find((f) => f.type === 'company_header');
    const config = (headerField?.fieldConfig || {}) as Record<string, unknown>;
    const addressLines = (config.addressLines as string[]) || [];
    setEditingHeader({
      logoUrl: (config.logoUrl as string) || '',
      companyName: (config.companyName as string) || '',
      companyNameTh: (config.companyNameTh as string) || '',
      memorandumTitle: (config.memorandumTitle as string) ?? 'MEMORANDUM',
      addressText: addressLines.join('\n'),
      memoNoLabel: (config.memoNoLabel as string) || '',
      refNoLabel: (config.refNoLabel as string) || '',
      quotationLabel: (config.quotationLabel as string) || '',
      jobNoLabel: (config.jobNoLabel as string) || '',
      dateLabel: (config.dateLabel as string) || '',
    });
    setEditingHeaderTemplateId(template.id);
  };

  const handleSaveHeader = async () => {
    if (!editingHeaderTemplateId) return;
    setHeaderSaving(true);
    try {
      const template = templates.find((t) => t.id === editingHeaderTemplateId);
      if (!template) return;
      const fields = template.fields ? JSON.parse(JSON.stringify(template.fields)) : [];
      const headerIndex = fields.findIndex((f: MemoField) => f.type === 'company_header');
      const fieldConfig = {
        logoUrl: editingHeader.logoUrl,
        companyName: editingHeader.companyName,
        companyNameTh: editingHeader.companyNameTh,
        memorandumTitle: editingHeader.memorandumTitle,
        addressLines: editingHeader.addressText.split('\n').map((s) => s.trim()).filter(Boolean),
        memoNoLabel: editingHeader.memoNoLabel,
        refNoLabel: editingHeader.refNoLabel,
        quotationLabel: editingHeader.quotationLabel,
        jobNoLabel: editingHeader.jobNoLabel,
        dateLabel: editingHeader.dateLabel,
      };
      if (headerIndex >= 0) {
        fields[headerIndex].fieldConfig = fieldConfig;
      } else {
        fields.unshift({
          id: 'company_header_1',
          name: 'company_header',
          label: 'ข้อมูลบริษัท',
          type: 'company_header',
          required: false,
          fieldConfig,
        });
      }
      await updateTemplate(editingHeaderTemplateId, { fields });
      setEditingHeaderTemplateId(null);
    } finally {
      setHeaderSaving(false);
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
        companyName: 'Digital Factory Company Limited',
        companyNameTh: 'บริษัท ดิจิทัล แฟคตอรี่ จำกัด (สำนักงานใหญ่)',
        memorandumTitle: 'MEMORANDUM',
        addressLines: [
          'อาคารโอลิมเปียไทยทาวเวอร์ ชั้น 4 เลขที่ 444',
          'ถนนรัชดาภิเษก แขวงสามเสนนอก',
          'เขตห้วยขวาง กรุงเทพมหานคร 10310',
        ],
        memoNoLabel: 'MEMO NO.',
        refNoLabel: 'REF. NO. (if any)',
        quotationLabel: 'Quotation no.',
        jobNoLabel: 'Job no.',
        dateLabel: 'DATE',
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
            <CardContent className="p-6">
              {/* Server Status */}
              {serverStatus && !serverStatus.startsWith('เชื่อมต่อ') && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                  <WifiOff className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-red-600">Server ส่งเมลยังไม่พร้อมใช้งาน</div>
                    <div className="text-xs text-red-500 mt-1">{serverStatus}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCheckServer}><RefreshCw className="h-3 w-3 mr-1" />ตรวจสอบอีกครั้ง</Button>
                </div>
              )}

              {/* SMTP Card */}
              <div className="border rounded-xl overflow-hidden mb-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 border-b">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Settings className="h-5 w-5" /></div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Mail Server (SMTP)</div>
                    <div className="text-xs text-slate-500">ตั้งค่า server สำหรับส่งอีเมล</div>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-xs">SMTP Host</Label><Input value={settings?.smtp.host || ''} onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, host: e.target.value } })} placeholder="smtp.gmail.com" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">SMTP Port</Label><Input value={settings?.smtp.port || 587} onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, port: parseInt(e.target.value) || 587 } })} placeholder="587" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Username</Label><Input type="email" value={settings?.smtp.user || ''} onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, user: e.target.value } })} placeholder="user@gmail.com" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Password</Label><Input type="password" value={settings?.smtp.password || ''} onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, password: e.target.value } })} placeholder="รหัสผ่านหรือ App Password" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">From Name</Label><Input value={settings?.smtp.fromName || ''} onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, fromName: e.target.value } })} placeholder="MemoHub" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">From Email Address</Label><Input type="email" value={settings?.smtp.fromEmail || ''} onChange={(e) => setSettings({ ...settings!, smtp: { ...settings!.smtp, fromEmail: e.target.value } })} placeholder="noreply@company.com" /></div>
                  </div>

                  {/* Gmail hint */}
                  {/(gmail|googlemail)\./.test((settings?.smtp.host || '').toLowerCase()) && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                      Gmail ต้องใช้ <strong>App Password</strong> (16 หลัก เช่น <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">abcd efgh ijkl mnop</code>) แทนรหัสผ่านปกติ —
                      เปิด <strong>2-Step Verification</strong> แล้วไปที่ <strong>Google Account → Security → App passwords</strong> เพื่อสร้าง
                    </div>
                  )}

                  {/* Encryption */}
                  <div className="flex items-center gap-3">
                    <Label className="text-xs whitespace-nowrap">Encryption:</Label>
                    <Select
                      value={settings?.smtp.encryption || 'TLS'}
                      onValueChange={(v) => {
                        const port = v === 'SSL' ? 465 : 587;
                        setSettings({ ...settings!, smtp: { ...settings!.smtp, encryption: v, secure: v === 'SSL', port } });
                      }}
                    >
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TLS">TLS</SelectItem>
                        <SelectItem value="SSL">SSL</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-slate-400">Port <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">465</code> = SSL (implicit TLS) | Port <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">587</code> = TLS (STARTTLS) — ระบบปรับ Encryption ให้อัตโนมัติตาม Port</p>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveSMTP} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'กำลังบันทึก...' : 'Save Configuration'}</Button>
                  </div>
                </div>
              </div>

              {/* Test Configuration Card */}
              <div className="border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4 bg-slate-50 border-b">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center"><Mail className="h-5 w-5" /></div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Test Configuration</div>
                    <div className="text-xs text-slate-500">ส่งอีเมลทดสอบเพื่อตรวจสอบการตั้งค่า</div>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5"><Label className="text-xs">Recipient Email</Label><Input type="email" value={testEmailTo} onChange={(e) => { setTestEmailTo(e.target.value); setTestEmailResult(null); }} placeholder="user@company.com" /></div>
                  {testEmailResult && (
                    <div className={`p-3 rounded-lg text-sm ${testEmailResult.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                      {testEmailResult.code && <span className="font-mono text-xs mr-1">[{testEmailResult.code}]</span>}
                      {testEmailResult.error || (testEmailResult.success && 'ส่งอีเมลสำเร็จ!')}
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                    สำหรับ <strong>Gmail</strong>: ถ้าเปิด 2-Step Verification ต้องใช้ <strong>App Password</strong> (Google Account → Security → App passwords) ไม่ใช้รหัสผ่านปกติ; ถ้ายังส่งไม่ได้ให้ไปเปิด
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Allow less secure apps</code> หรือใช้ SMTP Port <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">587</code> (TLS)
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={handleTestEmail} disabled={testEmailSending || !testEmailTo}>
                      <Send className="mr-2 h-4 w-4" />{testEmailSending ? 'กำลังส่ง...' : 'Send Test Email'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Format */}
        <TabsContent value="smtp">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>ตั้งค่าฟอร์แมทอีเมล</CardTitle>
              <CardDescription>กำหนดรูปแบบอีเมลที่จะส่งแจ้งเตือน (ใช้ตัวแปร {'{variable}'} ได้)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>หัวข้ออีเมล (Subject)</Label>
                <Input
                  value={settings?.emailFormat?.subject || '[MemoHub] {memo_number} - {title}'}
                  onChange={(e) => setSettings({ ...settings!, emailFormat: { subject: e.target.value, body: settings?.emailFormat?.body || '', preview: settings?.emailFormat?.preview || '' } })}
                  placeholder="[MemoHub] {memo_number} - {title}"
                />
                <p className="text-xs text-slate-500">ตัวแปร: {'`{memo_number}`'}, {'`{title}`'}, {'`{owner_name}`'}, {'`{status}`'}, {'`{deadline}`'}</p>
              </div>
              <div className="space-y-2">
                <Label>เนื้อหาอีเมล (Body)</Label>
                <Textarea
                  rows={6}
                  value={settings?.emailFormat?.body || ''}
                  onChange={(e) => setSettings({ ...settings!, emailFormat: { subject: settings?.emailFormat?.subject || '[MemoHub] {memo_number} - {title}', body: e.target.value, preview: settings?.emailFormat?.preview || '' } })}
                  placeholder={`สวัสดีค่ะ/ครับ

มี Memo ใหม่รอการอนุมัติของท่าน

กรุณาเข้าระบบเพื่ออนุมัติ Memo นี้`}
                />
                <p className="text-xs text-slate-500">ตัวแปร: {'`{memo_number}`'}, {'`{title}`'}, {'`{owner_name}`'}, {'`{status}`'}, {'`{deadline}`'}, {'`{approver_name}`'}, {'`{memo_url}`'}</p>
              </div>
              <div className="space-y-2">
                <Label>ตัวอย่าง Memo ในอีเมล (Preview Template)</Label>
                <Textarea
                  rows={10}
                  value={settings?.emailFormat?.preview || ''}
                  onChange={(e) => setSettings({ ...settings!, emailFormat: { subject: settings?.emailFormat?.subject || '[MemoHub] {memo_number} - {title}', body: settings?.emailFormat?.body || '', preview: e.target.value } })}
                  placeholder={`เลขที่: {memo_number}
หัวข้อ: {title}
ผู้สร้าง: {owner_name} ({department})
Deadline: {deadline}

{form_fields}

{body_text}

{approval_grid}`}
                />
                <p className="text-xs text-slate-500">ตัวแปร: {'`{memo_number}`'}, {'`{title}`'}, {'`{owner_name}`'}, {'`{department}`'}, {'`{status}`'}, {'`{deadline}`'}, {'`{created_at}`'}, {'`{form_fields}`'} (ข้อมูลฟอร์ม), {'`{body_text}`'} (เนื้อหา), {'`{approval_grid}`'} (ตารางอนุมัติ)</p>
              </div>
              <div className="space-y-2 pt-2 border-t">
                <Label>หัวข้ออีเมลแจ้งผู้สร้าง (เมื่อมีคนอนุมัติ/ปฏิเสธ)</Label>
                <Input
                  value={settings?.emailFormat?.ownerSubject || '[MemoHub] {memo_number} {action_label}โดย {actor_name}'}
                  onChange={(e) => setSettings({ ...settings!, emailFormat: { subject: settings?.emailFormat?.subject || '', body: settings?.emailFormat?.body || '', preview: settings?.emailFormat?.preview || '', ...settings?.emailFormat, ownerSubject: e.target.value } })}
                  placeholder="[MemoHub] {memo_number} {action_label}โดย {actor_name}"
                />
                <p className="text-xs text-slate-500">ตัวแปร: {'`{memo_number}`'}, {'`{title}`'}, {'`{owner_name}`'}, {'`{action_label}`'} (อนุมัติ/ถูกปฏิเสธ), {'`{actor_name}`'}, {'`{acted_at}`'}</p>
              </div>
              <div className="space-y-2">
                <Label>เนื้อหาอีเมลแจ้งผู้สร้าง</Label>
                <Textarea
                  rows={5}
                  value={settings?.emailFormat?.ownerBody || ''}
                  onChange={(e) => setSettings({ ...settings!, emailFormat: { subject: settings?.emailFormat?.subject || '', body: settings?.emailFormat?.body || '', preview: settings?.emailFormat?.preview || '', ...settings?.emailFormat, ownerBody: e.target.value } })}
                  placeholder={`สวัสดีค่ะ/ครับ

Memo ของท่านมีการดำเนินการ: {action_label}โดย {actor_name}
เลขที่: {memo_number}
เรื่อง: {title}

เปิดดูฟอร์ม Memo ฉบับเต็ม: {memo_link}`}
                />
                <p className="text-xs text-slate-500">ตัวแปร: {'`{memo_number}`'}, {'`{title}`'}, {'`{owner_name}`'}, {'`{status}`'}, {'`{action_label}`'}, {'`{actor_name}`'}, {'`{remark}`'} (เหตุผลเมื่อถูกปฏิเสธ), {'`{memo_link}`'}, {'`{acted_at}`'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleSaveEmailFormat} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />{saving ? 'กำลังบันทึก...' : 'บันทึกฟอร์แมท'}
                </Button>
              </div>
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">ตัวอย่างอีเมลที่จะส่ง:</p>
                <div className="text-sm text-slate-600 space-y-1 bg-white rounded-md p-3 border">
                  <p className="font-medium">Subject: [MemoHub] MH-20260903-0001 - จัดซื้อ/จัดจ้าง</p>
                  <hr className="my-2" />
                  <p>สวัสดีค่ะ/ครับ</p>
                  <p className="mt-2">มี Memo ใหม่รอการอนุมัติของท่าน</p>
                  <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                      <span className="font-medium">MH-20260903-0001</span> — <span>จัดซื้อ/จัดจ้าง</span>
                      <span className="ml-2 text-xs text-blue-600">รออนุมัติ</span>
                    </div>
                    <div className="p-3 space-y-1 text-xs">
                      <p><strong>ผู้สร้าง:</strong> พราวไพลิน สุขุมเดชะ (ไอที)</p>
                      <p><strong>Deadline:</strong> 10 กันยายน 2569</p>
                      <div className="mt-2 border-t pt-2">
                        <p className="font-medium mb-1">สถานะการอนุมัติ:</p>
                        <p className="text-green-600">✓ ผู้ขออนุมัติ — พราวไพลิน สุขุมเดชะ</p>
                        <p className="text-orange-500">○ ตรวจสอบ — ผู้ดูแลระบบ</p>
                        <p className="text-orange-500">○ อนุมัติ — จิรพล ยาวะพันธุ์</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <span className="inline-block px-6 py-2 bg-green-600 text-white text-xs rounded-lg font-semibold">อนุมัติ</span>
                    <span className="inline-block px-6 py-2 bg-red-600 text-white text-xs rounded-lg font-semibold ml-2">ปฏิเสธ</span>
                  </div>
                  <p className="mt-2 text-slate-400 text-center text-xs">MemoHub Digital Memo & Approval System</p>
                </div>
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
                  {sectionFields.map((field, i) => {
                    const isProtected = field.type === 'form_row' || field.type === 'company_header' || field.type === 'section_title';
                    return (
                      <div key={field.id} className="relative group">
                        {!isProtected && (
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
                        )}
                        {isProtected && (
                          <div className="absolute top-2 right-2 z-10">
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded border">
                              {field.type === 'form_row' ? 'ควบคุมโดยช่องกรอกข้อมูล' : 'ระบบ'}
                            </span>
                          </div>
                        )}
                        <SectionRenderer
                          field={field}
                          readonly
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>เทมเพลต Memo</CardTitle><CardDescription>จัดการเทมเพลตสำหรับสร้าง Memo</CardDescription></div>
                <Button onClick={handleCreateTemplate}><Plus className="mr-2 h-4 w-4" />สร้างเทมเพลตใหม่</Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {templates.map((t) => (
                  <div key={t.id} className="border rounded-lg overflow-hidden">
                    {/* Template header */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 border-b">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-slate-500" />
                        <div>
                          <h4 className="font-semibold text-slate-900">{t.name || <span className="text-slate-400 italic">ไม่มีชื่อ</span>}</h4>
                          {t.description && <p className="text-xs text-slate-500">{t.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(t)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />แก้ไขชื่อ
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenSections(t)}>
                          <Settings className="h-3.5 w-3.5 mr-1" />Sections
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicateTemplate(t)}>
                          <Copy className="h-3.5 w-3.5 mr-1" />คัดลอก
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteTemplate(t.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />ลบ
                        </Button>
                      </div>
                    </div>

                    {/* หัวข้อบริษัท (company_header) */}
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-slate-700">หัวข้อบริษัท (MEMORANDUM)</h5>
                        {editingHeaderTemplateId !== t.id ? (
                          <Button variant="ghost" size="sm" onClick={() => handleEditHeader(t)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />แก้ไข
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingHeaderTemplateId(null)}>ยกเลิก</Button>
                            <Button size="sm" onClick={handleSaveHeader} disabled={headerSaving}>
                              <Save className="h-3.5 w-3.5 mr-1" />{headerSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {editingHeaderTemplateId === t.id ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label>URL โลโก้</Label>
                            <Input
                              placeholder="https://..."
                              value={editingHeader.logoUrl}
                              onChange={(e) => setEditingHeader({ ...editingHeader, logoUrl: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label>ชื่อบริษัท (อังกฤษ, แถบบน)</Label>
                              <Input
                                placeholder="Digital Factory Company Limited"
                                value={editingHeader.companyName}
                                onChange={(e) => setEditingHeader({ ...editingHeader, companyName: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>ชื่อบริษัท (ไทย, ในกล่อง MEMORANDUM)</Label>
                              <Input
                                placeholder="บริษัท ดิจิทัล แฟคตอรี่ จำกัด (สำนักงานใหญ่)"
                                value={editingHeader.companyNameTh}
                                onChange={(e) => setEditingHeader({ ...editingHeader, companyNameTh: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label>หัวข้อ MEMORANDUM (เว้นว่าง = ซ่อน)</Label>
                            <Input
                              placeholder="MEMORANDUM"
                              value={editingHeader.memorandumTitle}
                              onChange={(e) => setEditingHeader({ ...editingHeader, memorandumTitle: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>ที่อยู่ (บรรทัดละ 1 บรรทัด)</Label>
                            <Textarea
                              rows={3}
                              placeholder={'อาคารโอลิมเปียไทยทาวเวอร์ ชั้น 4 เลขที่ 444\nถนนรัชดาภิเษก แขวงสามเสนนอก\nเขตห้วยขวาง กรุงเทพมหานคร 10310'}
                              value={editingHeader.addressText}
                              onChange={(e) => setEditingHeader({ ...editingHeader, addressText: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label>ป้าย MEMO NO.</Label>
                              <Input value={editingHeader.memoNoLabel} onChange={(e) => setEditingHeader({ ...editingHeader, memoNoLabel: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                              <Label>ป้าย REF. NO.</Label>
                              <Input value={editingHeader.refNoLabel} onChange={(e) => setEditingHeader({ ...editingHeader, refNoLabel: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                              <Label>ป้าย Quotation</Label>
                              <Input value={editingHeader.quotationLabel} onChange={(e) => setEditingHeader({ ...editingHeader, quotationLabel: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                              <Label>ป้าย Job</Label>
                              <Input value={editingHeader.jobNoLabel} onChange={(e) => setEditingHeader({ ...editingHeader, jobNoLabel: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                              <Label>ป้าย DATE</Label>
                              <Input value={editingHeader.dateLabel} onChange={(e) => setEditingHeader({ ...editingHeader, dateLabel: e.target.value })} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {(() => {
                            const headerField = (t.fields || []).find((f) => f.type === 'company_header');
                            const config = (headerField?.fieldConfig || {}) as Record<string, unknown>;
                            const addressLines = (config.addressLines as string[]) || [];
                            return (
                              <div className="p-2 bg-slate-50 rounded border text-sm space-y-1">
                                {(config.logoUrl as string) && (
                                  <div className="flex items-center gap-3">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={config.logoUrl as string} alt="logo" className="h-8 w-auto object-contain" />
                                  </div>
                                )}
                                <p className="font-medium text-slate-700">{(config.memorandumTitle as string) ?? 'MEMORANDUM'}</p>
                                <p className="font-medium text-slate-700">{(config.companyName as string) || <span className="italic text-slate-400">ไม่มีชื่อบริษัท (อังกฤษ)</span>}</p>
                                <p className="font-medium text-slate-700">{(config.companyNameTh as string) || <span className="italic text-slate-400">ไม่มีชื่อบริษัท (ไทย)</span>}</p>
                                {addressLines.map((line, i) => (
                                  <p key={i} className="text-xs text-slate-500">{line}</p>
                                ))}
                                <p className="text-xs text-slate-400">
                                  ป้าย: {(config.memoNoLabel as string) || 'MEMO NO.'} / {(config.refNoLabel as string) || 'REF. NO.'} / {(config.quotationLabel as string) || 'Quotation'} / {(config.jobNoLabel as string) || 'Job'} / {(config.dateLabel as string) || 'DATE'}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* ช่องกรอกข้อมูล Memo (form_row fields) */}
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-slate-700">ช่องกรอกข้อมูล Memo (ด้านซ้าย)</h5>
                        {editingFieldTemplateId !== t.id ? (
                          <Button variant="ghost" size="sm" onClick={() => handleEditFormFields(t)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />แก้ไข
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingFieldTemplateId(null)}>ยกเลิก</Button>
                            <Button size="sm" onClick={handleSaveFormFields} disabled={fieldSaving}>
                              <Save className="h-3.5 w-3.5 mr-1" />{fieldSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {editingFieldTemplateId === t.id ? (
                        <div className="space-y-2">
                          {editingFormFields.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 p-3 border rounded-lg bg-white">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveFormFieldUp(i)} disabled={i === 0}>
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveFormFieldDown(i)} disabled={i === editingFormFields.length - 1}>
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
                              <Input
                                className="w-40"
                                placeholder="Label (เช่น REF. No.)"
                                value={f.label}
                                onChange={(e) => updateFormField(i, { label: e.target.value })}
                              />
                              <Select value={f.type} onValueChange={(v) => updateFormField(i, { type: v })}>
                                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="dropdown">Dropdown</SelectItem>
                                </SelectContent>
                              </Select>
                              {f.type === 'dropdown' && (
                                <div className="flex-1 space-y-1">
                                  <div className="flex flex-wrap gap-1">
                                    {(Array.isArray(f.options) ? f.options : []).map((opt, oi) => (
                                      <span key={oi} className="inline-flex items-center gap-1 bg-slate-100 border rounded px-2 py-0.5 text-xs">
                                        {opt}
                                        <button type="button" onClick={() => {
                                          const newOpts = (Array.isArray(f.options) ? f.options : []).filter((_, j) => j !== oi);
                                          updateFormField(i, { options: newOpts });
                                        }} className="text-red-400 hover:text-red-600">&times;</button>
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex gap-1">
                                    <Input
                                      className="flex-1 text-xs"
                                      placeholder="เพิ่มรายการใหม่"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const val = (e.target as HTMLInputElement).value.trim();
                                          if (val) {
                                            updateFormField(i, { options: [...(Array.isArray(f.options) ? f.options : []), val] });
                                            (e.target as HTMLInputElement).value = '';
                                          }
                                        }
                                      }}
                                    />
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => {
                                      const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement);
                                      const val = input?.value.trim();
                                      if (val) {
                                        updateFormField(i, { options: [...(Array.isArray(f.options) ? f.options : []), val] });
                                        input.value = '';
                                      }
                                    }}>เพิ่ม</Button>
                                  </div>
                                </div>
                              )}
                              <Input
                                className="w-32"
                                placeholder="Key"
                                value={f.name}
                                onChange={(e) => updateFormField(i, { name: e.target.value })}
                              />
                              <button
                                type="button"
                                onClick={() => updateFormField(i, { required: !f.required })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${f.required ? 'bg-red-500' : 'bg-slate-300'}`}
                                title={f.required ? 'บังคับกรอก' : 'ไม่บังคับ'}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${f.required ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                              <span className="text-xs text-slate-500 w-12">{f.required ? 'บังคับ' : ''}</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => removeFormField(i)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={addFormField}>
                            <Plus className="h-3.5 w-3.5 mr-1" />เพิ่มช่องกรอกข้อมูล
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {(() => {
                            const formRow = (t.fields || []).find((f) => f.type === 'form_row');
                            const config = (formRow?.fieldConfig || {}) as { fields?: Array<{ name: string; label: string; type: string; options?: string[]; required?: boolean }> };
                            const fields = config.fields || [];
                            if (fields.length === 0) {
                              return <p className="text-xs text-slate-500 text-center py-2">ยังไม่มีช่องกรอกข้อมูล — กด &quot;แก้ไข&quot; เพื่อเพิ่ม</p>;
                            }
                            return fields.map((f, i) => (
                              <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded border text-sm">
                                <span className="font-medium text-slate-700 w-40">
                                  {f.label || <span className="italic text-slate-400">ไม่มี label</span>}
                                  {f.required && <span className="text-red-500 ml-1">*</span>}
                                </span>
                                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{f.type}</span>
                                {f.type === 'dropdown' && Array.isArray(f.options) && f.options.length > 0 && (
                                  <span className="text-xs text-slate-500 ml-1">({f.options.join(', ')})</span>
                                )}
                                {f.required && (
                                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">บังคับ</span>
                                )}
                                <span className="text-xs text-slate-400 ml-auto">key: {f.name}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Sections list - all sections from template */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-slate-700">Sections ทั้งหมดใน Memo</h5>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenSections(t)}>
                          <Settings className="h-3.5 w-3.5 mr-1" />แก้ไข Sections
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {(t.fields || []).map((f, i) => {
                          const typeLabels: Record<string, string> = {
                            company_header: 'หัวข้อบริษัท',
                            section_title: '标题',
                            form_row: 'ฟอร์มกรอกข้อมูล',
                            body_text: 'เนื้อหา',
                            file_upload: 'แนบไฟล์',
                            checkbox_group: 'จุดประสงค์',
                            dropdown_select: 'เลือกรายการ',
                            approval_grid: 'ตารางอนุมัติ',
                          };
                          const isHidden = f.type === 'memo_type' || f.type === 'section_title';
                          if (isHidden) return null;
                          const isProtected = f.type === 'form_row' || f.type === 'company_header';
                          return (
                            <div key={i} className={`flex items-center gap-3 p-2 rounded border text-sm ${isProtected ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}>
                              <span className="font-medium text-slate-700 w-48">{f.label || typeLabels[f.type] || f.type}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${isProtected ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>{typeLabels[f.type] || f.type}</span>
                              {f.type === 'form_row' && (() => {
                                const config = (f.fieldConfig || {}) as { fields?: Array<{ name: string; label: string }> };
                                const subFields = config.fields || [];
                                return (
                                  <span className="text-xs text-blue-600 ml-1">
                                    ({subFields.length} fields: {subFields.map((sf) => sf.label).join(', ')})
                                  </span>
                                );
                              })()}
                              {isProtected && (
                                <span className="text-xs text-blue-500 ml-auto">ควบคุมโดยช่องกรอกข้อมูล</span>
                              )}
                              {!isProtected && (
                                <span className="text-xs text-slate-400 ml-auto">key: {f.name}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {templates.length === 0 && (
                  <p className="text-center text-slate-500 py-8">ยังไม่มีเทมเพลต — กด &quot;สร้างเทมเพลตใหม่&quot; เพื่อเริ่มต้น</p>
                )}
              </CardContent>
            </Card>
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
                  <><XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{testEmailResult.code && `[${testEmailResult.code}] `}{testEmailResult.error}</span></>
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
