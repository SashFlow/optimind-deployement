'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Venus as GenderFemaleIcon,
  Mars as GenderMaleIcon,
  Link as LinkIcon,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { WelcomeImage } from '@components/app/welcome-view';
import { Button } from '@repo/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@repo/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
import { Badge } from '@repo/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/table';

const modes = [
  { id: 'audio', label: 'Audio Assistant' },
  { id: 'avatar', label: 'Avatar Assistant' },
] as const;

const agents = [
  {
    name: 'Sanjay',
    url: '/sanjay.mp4',
    icon: <GenderMaleIcon size={48} />,
  },
  {
    name: 'Samira',
    url: '/anjali.mp4',
    icon: <GenderFemaleIcon size={48} />,
  },
];

const popularIndianLanguages = [
  'English',
  'Hindi',
  'Marathi',
  'Bengali',
  'Multilingual- Primary English',
];

type Mode = (typeof modes)[number]['id'];

interface DemoLink {
  id: string;
  label: string;
  slug: string;
  createdAt: Date;
}

const ITEMS_PER_PAGE = 5;

function generateSlug(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'demo';
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button size="icon" variant="ghost" onClick={handleCopy} className="h-7 w-7">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function AudioWaveformPreview() {
  return (
    <div className="bg-muted/40 flex aspect-3/2 w-full items-center justify-center gap-1 rounded-lg border px-4 py-3">
      <WelcomeImage />
    </div>
  );
}

export default function Page() {
  // Demo links table state
  const [demoLinks, setDemoLinks] = useState<DemoLink[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');

  // Playground state
  const [selectedMode, setSelectedMode] = useState<Mode>('avatar');
  const [selectedAgentSlug, setSelectedAgentSlug] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

  const totalPages = Math.max(1, Math.ceil(demoLinks.length / ITEMS_PER_PAGE));
  const paginatedLinks = demoLinks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleGenerateLink = () => {
    if (!newLinkLabel.trim()) return;
    const slug = generateSlug(newLinkLabel.trim());
    const newLink: DemoLink = {
      id: crypto.randomUUID(),
      label: newLinkLabel.trim(),
      slug,
      createdAt: new Date(),
    };
    setDemoLinks((prev) => [newLink, ...prev]);
    setCurrentPage(1);
    setNewLinkLabel('');
    setDialogOpen(false);
  };

  const nextHref =
    selectedAgentSlug == null
      ? null
      : `/${selectedMode}/medical-examination?language=${selectedLanguage}&selectedAgent=${selectedAgentSlug}`;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 md:px-10">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Sashflow</h1>
            <p className="text-muted-foreground text-sm">
              Manage demo links and explore assistant configurations.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="shrink-0">
            <LinkIcon className="mr-2 h-4 w-4" />
            Generate Link
          </Button>
        </div>

        {/* Generate Link Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Demo Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <label className="text-sm font-medium">Label</label>
              <Input
                placeholder="e.g. Client Demo — ABC Corp"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateLink()}
                autoFocus
              />
              <p className="text-muted-foreground text-xs">
                A unique shareable link will be created under <code>/demo/</code>.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateLink} disabled={!newLinkLabel.trim()}>
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Demo Links Table */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Demo Links</h2>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLinks.length > 0 ? (
                  paginatedLinks.map((link) => {
                    const url = `${origin}/demo/${link.slug}`;
                    return (
                      <TableRow key={link.id}>
                        <TableCell className="font-medium">{link.label}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="font-mono text-xs">
                              /demo/{link.slug}
                            </Badge>
                            <CopyButton text={url} />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {link.createdAt.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" asChild className="h-7 w-7">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground h-24 text-center text-sm">
                      No demo links yet. Click <strong>Generate Link</strong> to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {demoLinks.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Playground Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Playground</CardTitle>
            <CardDescription>
              Configure and launch an assistant session directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode selector */}
            <div className="flex flex-wrap gap-2">
              {modes.map((mode) => (
                <Button
                  key={mode.id}
                  variant={selectedMode === mode.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedMode(mode.id);
                    setSelectedAgentSlug(null);
                  }}
                >
                  {mode.label}
                </Button>
              ))}
            </div>

            {/* Agent selector */}
            <div className="grid gap-4 sm:grid-cols-2">
              {agents.map((agent) => {
                const isSelected = agent.name === selectedAgentSlug;
                return (
                  <Card
                    key={agent.name}
                    className={isSelected ? 'border-primary ring-primary/20 ring-2' : undefined}
                  >
                    <CardHeader className="space-y-3 pb-3">
                      {selectedMode === 'audio' ? (
                        <AudioWaveformPreview />
                      ) : (
                        <div className="bg-muted/40 flex aspect-3/2 w-full items-center justify-center rounded-lg border">
                          {agent.icon}
                        </div>
                      )}
                      <CardTitle className="text-center text-sm">Dr. {agent.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button
                        className="w-full"
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => setSelectedAgentSlug(agent.name)}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Language + Proceed */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Preferred Language</p>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    {popularIndianLanguages.map((language) => (
                      <SelectItem key={language} value={language}>
                        {language}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {nextHref ? (
                <Button asChild className="w-full sm:w-auto">
                  <Link href={nextHref}>Proceed</Link>
                </Button>
              ) : (
                <Button className="w-full sm:w-auto" disabled>
                  Proceed
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}
