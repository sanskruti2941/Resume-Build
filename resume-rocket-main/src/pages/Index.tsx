import { ChangeEvent, CSSProperties, Dispatch, ReactNode, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Bot, BriefcaseBusiness, CheckCircle2, Download, GraduationCap, GripVertical, Layers3, Link as LinkIcon, Mail, Moon, Palette, Phone, Plus, Save, Share2, Sparkles, Sun, Trash2, Upload, UserRound, Wand2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Template = "minimal" | "modern" | "creative";
type JobRole = "frontend" | "backend" | "data science" | "product" | "marketing";
type BuiltInSectionKey = "summary" | "links" | "education" | "experience" | "projects" | "technicalSkills" | "softSkills";
type CustomSectionKey = `custom:${string}`;
type SectionKey = BuiltInSectionKey | CustomSectionKey;

type LinkItem = { id: string; label: string; url: string };
type Education = { id: string; school: string; degree: string; years: string; details: string };
type Experience = { id: string; company: string; role: string; years: string; bullets: string[] };
type Project = { id: string; name: string; link: string; bullets: string[] };
type CustomField = { id: string; label: string; value: string };
type CustomSection = { id: string; title: string; fields: CustomField[] };
type Resume = {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  links: LinkItem[];
  education: Education[];
  experience: Experience[];
  projects: Project[];
  technicalSkills: string[];
  softSkills: string[];
  customSections: CustomSection[];
};

type Version = { id: string; name: string; savedAt: string; resume: Resume; template: Template; accent: string; darkMode: boolean; sectionOrder: SectionKey[]; visibleSections: SectionKey[] };

const sectionLabels: Record<BuiltInSectionKey, string> = {
  summary: "Summary",
  links: "Social links",
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  technicalSkills: "Technical skills",
  softSkills: "Non-technical skills",
};

const sectionIcons: Record<BuiltInSectionKey, typeof UserRound> = {
  summary: UserRound,
  links: LinkIcon,
  education: GraduationCap,
  experience: BriefcaseBusiness,
  projects: Layers3,
  technicalSkills: Sparkles,
  softSkills: CheckCircle2,
};

const accentOptions = [
  { name: "Teal", hsl: "172 36% 38%" },
  { name: "Indigo", hsl: "238 57% 58%" },
  { name: "Ember", hsl: "12 78% 55%" },
  { name: "Emerald", hsl: "151 55% 34%" },
];

const roleKeywords: Record<JobRole, string[]> = {
  frontend: ["React", "TypeScript", "Accessibility", "Performance", "Design systems", "Responsive UI", "Testing", "State management"],
  backend: ["APIs", "Databases", "Authentication", "Caching", "Scalability", "Observability", "Security", "Distributed systems"],
  "data science": ["Python", "SQL", "Machine learning", "Experimentation", "Dashboards", "Feature engineering", "Model evaluation", "Statistics"],
  product: ["Roadmaps", "User research", "Prioritization", "Metrics", "Go-to-market", "Stakeholder alignment", "Experimentation", "Discovery"],
  marketing: ["Lifecycle", "SEO", "Campaigns", "Positioning", "Analytics", "Conversion", "Content strategy", "Segmentation"],
};

const actionTips = ["Led", "Built", "Launched", "Optimized", "Reduced", "Increased", "Automated", "Designed", "Delivered", "Improved"];
const achievementTips = ["Start bullets with a strong verb", "Add numbers: revenue, users, time saved, quality gains", "Mirror keywords from the job description", "Keep each bullet to one clear outcome", "Avoid passive phrases like responsible for"];

const id = () => crypto.randomUUID();

const initialResume: Resume = {
  name: "Maya Chen",
  title: "Senior Product Designer",
  email: "maya.chen@email.com",
  phone: "+1 415 555 0198",
  location: "San Francisco, CA",
  summary: "Product designer with 6+ years creating polished, accessible interfaces for high-growth SaaS teams. Known for turning ambiguous workflows into intuitive product systems that improve activation and retention.",
  links: [
    { id: id(), label: "LinkedIn", url: "linkedin.com/in/mayachen" },
    { id: id(), label: "Portfolio", url: "maya.design" },
    { id: id(), label: "GitHub", url: "github.com/mayachen" },
  ],
  education: [{ id: id(), school: "California College of the Arts", degree: "BFA Interaction Design", years: "2014 — 2018", details: "Graduated with distinction; focused on human-computer interaction." }],
  experience: [
    { id: id(), company: "Northstar Labs", role: "Senior Product Designer", years: "2021 — Present", bullets: ["Redesigned onboarding for a fintech product, increasing profile completion by 32% in one quarter.", "Built a reusable component system adopted by 7 product squads, reducing design QA cycles by 40%."] },
    { id: id(), company: "Atlas Hiring", role: "Product Designer", years: "2018 — 2021", bullets: ["Led research and UI redesign for recruiter dashboards used by 18,000 monthly users.", "Partnered with engineering to ship accessible workflow improvements that cut task time by 24%."] },
  ],
  projects: [
    { id: id(), name: "Candidate Intelligence Suite", link: "atlas.work", bullets: ["Designed recruiter insights pages with explainable scoring and clearer hiring signals."] },
    { id: id(), name: "Fintech Mobile Activation", link: "northstar.app", bullets: ["Created mobile onboarding patterns that improved first-week retention for new savers."] },
  ],
  technicalSkills: ["Figma", "Design systems", "React basics", "WCAG", "Prototyping", "User analytics"],
  softSkills: ["Workshop facilitation", "Stakeholder management", "Mentorship", "Product strategy", "Clear communication"],
  customSections: [],
};

const defaultOrder: BuiltInSectionKey[] = ["summary", "links", "experience", "projects", "education", "technicalSkills", "softSkills"];
const isCustomSection = (section: SectionKey): section is CustomSectionKey => section.startsWith("custom:");
const getCustomSectionKey = (sectionId: string): CustomSectionKey => `custom:${sectionId}`;

const Field = ({ label, value, onChange, multiline = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; placeholder?: string }) => (
  <label className="grid gap-2 text-sm font-bold text-foreground">
    <span>{label}</span>
    {multiline ? (
      <textarea className="min-h-24 resize-none rounded-md border border-input bg-card px-3 py-3 text-sm font-semibold leading-6 text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/25" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    ) : (
      <input className="h-11 rounded-md border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/25" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    )}
  </label>
);

const IconButton = ({ label, onClick, children, disabled = false }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) => (
  <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-secondary hover:text-secondary disabled:pointer-events-none disabled:opacity-35">
    {children}
  </button>
);

const PanelTitle = ({ icon: Icon, title, action }: { icon: typeof UserRound; title: string; action?: ReactNode }) => (
  <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground"><Icon className="size-4" /></span>
      <h2 className="font-sans text-sm font-extrabold uppercase tracking-normal text-foreground">{title}</h2>
    </div>
    {action}
  </div>
);

const BulletEditor = ({ bullets, onChange, onImprove }: { bullets: string[]; onChange: (bullets: string[]) => void; onImprove: (index: number) => void }) => (
  <div className="grid gap-2">
    {bullets.map((bullet, index) => (
      <div key={index} className="grid gap-2 md:grid-cols-[1fr_auto]">
        <Field label={`Bullet ${index + 1}`} value={bullet} onChange={(value) => onChange(bullets.map((item, itemIndex) => itemIndex === index ? value : item))} multiline />
        <div className="flex items-end gap-2 pb-1">
          <IconButton label="Improve bullet" onClick={() => onImprove(index)}><Wand2 className="size-4" /></IconButton>
          {bullets.length > 1 && <IconButton label="Remove bullet" onClick={() => onChange(bullets.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="size-4" /></IconButton>}
        </div>
      </div>
    ))}
    <button type="button" className="inline-flex w-fit items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-extrabold text-secondary-foreground transition hover:translate-y-[-1px]" onClick={() => onChange([...bullets, ""])}><Plus className="size-4" /> Add bullet</button>
  </div>
);

const parseList = (text: string) => text.split(/,|\n/).map((item) => item.trim()).filter(Boolean);
const normalizeResume = (resume: Resume): Resume => ({ ...resume, customSections: resume.customSections || [] });

const Index = () => {
  const [resume, setResume] = useState<Resume>(() => {
    const saved = localStorage.getItem("resume-studio-current");
    return saved ? normalizeResume(JSON.parse(saved)) : initialResume;
  });
  const [template, setTemplate] = useState<Template>(() => (localStorage.getItem("resume-studio-template") as Template) || "modern");
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>(() => JSON.parse(localStorage.getItem("resume-studio-order") || JSON.stringify(defaultOrder)));
  const [visibleSections, setVisibleSections] = useState<SectionKey[]>(() => JSON.parse(localStorage.getItem("resume-studio-visible") || JSON.stringify(defaultOrder)));
  const [accent, setAccent] = useState(() => localStorage.getItem("resume-studio-accent") || accentOptions[0].hsl);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("resume-studio-dark") === "true");
  const [role, setRole] = useState<JobRole>("frontend");
  const [harshMode, setHarshMode] = useState(false);
  const [aiNotes, setAiNotes] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [draggedSection, setDraggedSection] = useState<SectionKey | null>(null);
  const previewRef = useRef<HTMLElement>(null);

  useEffect(() => {
    localStorage.setItem("resume-studio-current", JSON.stringify(resume));
    localStorage.setItem("resume-studio-template", template);
    localStorage.setItem("resume-studio-order", JSON.stringify(sectionOrder));
    localStorage.setItem("resume-studio-visible", JSON.stringify(visibleSections));
    localStorage.setItem("resume-studio-accent", accent);
    localStorage.setItem("resume-studio-dark", String(darkMode));
  }, [resume, template, sectionOrder, visibleSections, accent, darkMode]);

  const themeStyle = { "--secondary": accent, "--ring": accent, "--accent": accent } as CSSProperties;
  const activeSections = sectionOrder.filter((section) => visibleSections.includes(section));
  const hiddenSections = defaultOrder.filter((section) => !visibleSections.includes(section));
  const getSectionLabel = (section: SectionKey) => isCustomSection(section) ? resume.customSections.find((item) => getCustomSectionKey(item.id) === section)?.title || "Custom section" : sectionLabels[section];
  const getSectionIcon = (section: SectionKey) => isCustomSection(section) ? Layers3 : sectionIcons[section];

  const addCustomSection = () => {
    const newSection: CustomSection = { id: id(), title: "Custom section", fields: [{ id: id(), label: "Field", value: "Add details here" }] };
    const key = getCustomSectionKey(newSection.id);
    setResume((current) => ({ ...current, customSections: [...(current.customSections || []), newSection] }));
    setSectionOrder((current) => [...current, key]);
    setVisibleSections((current) => [...current, key]);
  };

  const removeCustomSection = (sectionId: string) => {
    const key = getCustomSectionKey(sectionId);
    setResume((current) => ({ ...current, customSections: current.customSections.filter((section) => section.id !== sectionId) }));
    setSectionOrder((current) => current.filter((section) => section !== key));
    setVisibleSections((current) => current.filter((section) => section !== key));
  };

  const atsScore = useMemo(() => {
    const text = JSON.stringify(resume).toLowerCase();
    const keywordHits = roleKeywords[role].filter((keyword) => text.includes(keyword.toLowerCase())).length;
    const bulletCount = [...resume.experience.flatMap((item) => item.bullets), ...resume.projects.flatMap((item) => item.bullets)].filter(Boolean).length;
    const metrics = (text.match(/\d+%|\$|\d+x|\d,\d|\b\d{2,}\b/g) || []).length;
    const essentials = [resume.name, resume.email, resume.phone, resume.location, resume.summary].filter(Boolean).length;
    return Math.min(100, Math.round(essentials * 6 + keywordHits * 4 + bulletCount * 3 + metrics * 5 + resume.technicalSkills.length * 1.5 + resume.softSkills.length));
  }, [resume, role]);

  const validation = useMemo(() => {
    const items = [];
    if (!resume.email.includes("@")) items.push("Add a valid email address.");
    if (resume.summary.length < 80) items.push("Strengthen the summary with more context and impact.");
    if (!JSON.stringify(resume).match(/\d+%|\$|\d+x|\b\d{2,}\b/)) items.push("Add measurable results to experience or project bullets.");
    if (resume.technicalSkills.length < 5) items.push("Add at least five technical skills.");
    return items;
  }, [resume]);

  const moveSection = (section: SectionKey, direction: -1 | 1) => {
    const index = sectionOrder.indexOf(section);
    const target = index + direction;
    if (target < 0 || target >= sectionOrder.length) return;
    const next = [...sectionOrder];
    [next[index], next[target]] = [next[target], next[index]];
    setSectionOrder(next);
  };

  const reorderSection = (source: SectionKey, target: SectionKey) => {
    if (source === target) return;
    setSectionOrder((current) => {
      const next = current.filter((section) => section !== source);
      const targetIndex = next.indexOf(target);
      if (targetIndex === -1) return current;
      next.splice(targetIndex, 0, source);
      return next;
    });
  };

  const callAi = async (body: Record<string, unknown>) => {
    setIsBusy(true);
    const { data, error } = await supabase.functions.invoke("resume-ai", { body });
    setIsBusy(false);
    if (error) {
      toast.error(error.message || "AI request failed");
      return null;
    }
    return data as Record<string, unknown>;
  };

  const improveBullet = async (kind: "experience" | "projects", itemIndex: number, bulletIndex: number) => {
    const source = kind === "experience" ? resume.experience[itemIndex].bullets[bulletIndex] : resume.projects[itemIndex].bullets[bulletIndex];
    const data = await callAi({ mode: "improveBullet", content: source });
    if (!data?.text || typeof data.text !== "string") return;
    if (kind === "experience") {
      setResume((current) => ({ ...current, experience: current.experience.map((item, index) => index === itemIndex ? { ...item, bullets: item.bullets.map((bullet, indexBullet) => indexBullet === bulletIndex ? data.text as string : bullet) } : item) }));
    } else {
      setResume((current) => ({ ...current, projects: current.projects.map((item, index) => index === itemIndex ? { ...item, bullets: item.bullets.map((bullet, indexBullet) => indexBullet === bulletIndex ? data.text as string : bullet) } : item) }));
    }
  };

  const improveResume = async () => {
    const data = await callAi({ mode: "improveResume", resume });
    if (data?.resume) {
      setResume(data.resume as Resume);
      setAiNotes(Array.isArray(data.notes) ? data.notes as string[] : ["Resume language improved."]);
      toast.success("Resume improved without changing your template.");
    }
  };

  const getFeedback = async () => {
    const data = await callAi({ mode: "feedback", resume, harsh: harshMode });
    setAiNotes([...(Array.isArray(data?.feedback) ? data?.feedback as string[] : []), ...(Array.isArray(data?.warnings) ? data?.warnings as string[] : [])]);
  };

  const getKeywords = async () => {
    const data = await callAi({ mode: "keywords", role });
    const keywords = Array.isArray(data?.keywords) ? data.keywords as string[] : roleKeywords[role];
    setAiNotes([`Suggested ${role} keywords: ${keywords.join(", ")}`, ...(Array.isArray(data?.tips) ? data.tips as string[] : [])]);
  };

  const saveVersion = () => {
    const versions: Version[] = JSON.parse(localStorage.getItem("resume-studio-versions") || "[]");
    const next = [{ id: id(), name: `${resume.name || "Resume"} · ${new Date().toLocaleDateString()}`, savedAt: new Date().toISOString(), resume, template, accent, darkMode, sectionOrder, visibleSections }, ...versions].slice(0, 8);
    localStorage.setItem("resume-studio-versions", JSON.stringify(next));
    toast.success("Version saved locally.");
  };

  const loadVersion = (version: Version) => {
    setResume(normalizeResume(version.resume));
    setTemplate(version.template);
    setAccent(version.accent);
    setDarkMode(version.darkMode);
    setSectionOrder(version.sectionOrder);
    setVisibleSections(version.visibleSections);
  };

  const shareResume = async () => {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ resume, template, accent, darkMode, sectionOrder, visibleSections }))));
    const url = `${window.location.origin}${window.location.pathname}#resume=${payload}`;
    await navigator.clipboard.writeText(url);
    toast.success("Shareable resume link copied.");
  };

  useEffect(() => {
    const hash = window.location.hash.replace("#resume=", "");
    if (!hash) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(hash))));
      setResume(normalizeResume(parsed.resume));
      setTemplate(parsed.template);
      setAccent(parsed.accent);
      setDarkMode(Boolean(parsed.darkMode));
      setSectionOrder(parsed.sectionOrder);
      setVisibleSections(parsed.visibleSections);
      toast.success("Shared resume loaded.");
    } catch {
      toast.error("Shared resume link could not be loaded.");
    }
  }, []);

  const downloadPdf = async () => {
    if (!previewRef.current) return;
    setIsBusy(true);
    const exportRoot = document.createElement("div");
    const exportNode = previewRef.current.cloneNode(true) as HTMLElement;
    try {
      await document.fonts.ready;
      exportRoot.className = darkMode ? "dark" : "";
      exportRoot.style.position = "fixed";
      exportRoot.style.left = "-10000px";
      exportRoot.style.top = "0";
      exportRoot.style.width = "210mm";
      exportRoot.style.setProperty("--secondary", accent);
      exportRoot.style.setProperty("--ring", accent);
      exportRoot.style.setProperty("--accent", accent);
      exportNode.style.width = "210mm";
      exportNode.style.maxWidth = "210mm";
      exportNode.style.minHeight = "297mm";
      exportNode.style.margin = "0";
      exportNode.style.boxShadow = "none";
      exportRoot.appendChild(exportNode);
      document.body.appendChild(exportRoot);

      const previewBackground = getComputedStyle(exportNode).backgroundColor;
      const canvas = await html2canvas(exportNode, { scale: 2, backgroundColor: previewBackground, useCORS: true, windowWidth: exportNode.scrollWidth, windowHeight: exportNode.scrollHeight });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let renderedHeight = 0;

      while (renderedHeight < imgHeight) {
        if (renderedHeight > 0) pdf.addPage();
        pdf.addImage(img, "PNG", 0, -renderedHeight, pageWidth, imgHeight);
        renderedHeight += pageHeight;
      }

      const fileName = `${(resume.name || "resume").trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "resume"}.pdf`;
      pdf.save(fileName);
      toast.success("PDF downloaded.");
    } catch (error) {
      console.error(error);
      toast.error("PDF download failed. Please try again.");
    } finally {
      exportRoot.remove();
      setIsBusy(false);
    }
  };

  const importResume = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    let text = "";
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);
        const content = await page.getTextContent();
        text += content.items.map((item) => "str" in item ? item.str : "").join(" ") + "\n";
      }
    } else {
      text = await file.text();
    }
    const lines = text.split(/\n|\r/).map((line) => line.trim()).filter(Boolean);
    setResume((current) => ({
      ...current,
      name: lines[0] || current.name,
      title: lines[1] || current.title,
      email: text.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || current.email,
      phone: text.match(/\+?[\d\s().-]{8,}/)?.[0]?.trim() || current.phone,
      summary: lines.slice(2, 6).join(" ") || current.summary,
      technicalSkills: parseList(lines.find((line) => /skills/i.test(line))?.replace(/skills:?/i, "") || current.technicalSkills.join(", ")),
    }));
    toast.success("Resume imported and key fields filled.");
  };

  const versions: Version[] = JSON.parse(localStorage.getItem("resume-studio-versions") || "[]");

  const renderPreviewSection = (section: SectionKey) => {
    if (isCustomSection(section)) {
      const custom = resume.customSections.find((item) => getCustomSectionKey(item.id) === section);
      if (!custom) return null;
      return <section key={section}><PreviewHeading>{custom.title}</PreviewHeading><div className="grid gap-2 text-[9.5pt] leading-5 text-foreground">{custom.fields.filter((field) => field.label || field.value).map((field) => <div key={field.id} className="break-inside-avoid"><strong className="text-primary">{field.label}</strong>{field.label && field.value ? <span className="text-muted-foreground"> — </span> : null}<span className="whitespace-pre-line text-muted-foreground">{field.value}</span></div>)}</div></section>;
    }
    if (section === "summary") return <section key={section}><PreviewHeading>Profile</PreviewHeading><p className="text-[10.5pt] leading-6 text-foreground">{resume.summary}</p></section>;
    if (section === "links") return <section key={section}><PreviewHeading>Links</PreviewHeading><div className="grid gap-1 text-[9.5pt] font-bold text-muted-foreground">{resume.links.map((link) => <span key={link.id}>{link.label}: {link.url}</span>)}</div></section>;
    if (section === "education") return <section key={section}><PreviewHeading>Education</PreviewHeading>{resume.education.map((item) => <div key={item.id} className="mb-3"><div className="flex justify-between gap-3"><strong className="text-[10.5pt]">{item.degree}</strong><span className="text-[9pt] font-bold text-muted-foreground">{item.years}</span></div><p className="text-[9.5pt] font-bold text-secondary">{item.school}</p><p className="text-[9.5pt] leading-5 text-muted-foreground">{item.details}</p></div>)}</section>;
    if (section === "experience") return <section key={section}><PreviewHeading>Experience</PreviewHeading>{resume.experience.map((item) => <div key={item.id} className="mb-4 break-inside-avoid"><div className="flex justify-between gap-3"><strong className="text-[11pt]">{item.role}</strong><span className="text-[9pt] font-bold text-muted-foreground">{item.years}</span></div><p className="text-[9.5pt] font-bold text-secondary">{item.company}</p><ul className="mt-2 list-disc space-y-1 pl-4 text-[9.5pt] leading-5 text-foreground">{item.bullets.filter(Boolean).map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div>)}</section>;
    if (section === "projects") return <section key={section}><PreviewHeading>Projects</PreviewHeading><div className={template === "modern" ? "grid grid-cols-2 gap-3" : "grid gap-3"}>{resume.projects.map((project) => <div key={project.id} className="break-inside-avoid rounded-md border border-border p-3"><div className="flex flex-wrap justify-between gap-2"><strong className="text-[10.5pt]">{project.name}</strong><span className="text-[8.5pt] font-extrabold text-secondary">{project.link}</span></div><ul className="mt-2 list-disc space-y-1 pl-4 text-[9pt] leading-5 text-muted-foreground">{project.bullets.filter(Boolean).map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div>)}</div></section>;
    const skills = section === "technicalSkills" ? resume.technicalSkills : resume.softSkills;
    return <section key={section}><PreviewHeading>{sectionLabels[section]}</PreviewHeading><ul className={template === "creative" ? "grid grid-cols-2 gap-x-5 gap-y-1 text-[9.5pt]" : "flex flex-wrap gap-2 text-[9pt]"}>{skills.map((skill) => template === "creative" ? <li key={skill} className="list-disc marker:text-secondary">{skill}</li> : <li key={skill} className="rounded-md bg-preview-soft px-2 py-1 font-extrabold text-primary">{skill}</li>)}</ul></section>;
  };

  return (
    <main className={`${darkMode ? "dark" : ""} min-h-screen bg-background text-foreground resume-grid`} style={themeStyle}>
      <section className="border-b border-border bg-hero-gradient px-4 py-6 text-primary-foreground md:px-8">
        <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 text-sm font-extrabold backdrop-blur"><Bot className="size-4" /> AI Resume Studio</div>
            <h1 className="max-w-4xl font-display text-5xl leading-none md:text-7xl">Premium resumes with real-time AI polish.</h1>
          </div>
          <div className="grid gap-3 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 p-3 backdrop-blur md:min-w-[560px]">
            <div className="grid grid-cols-3 gap-2">
              {(["minimal", "modern", "creative"] as Template[]).map((item) => <button key={item} type="button" onClick={() => setTemplate(item)} className={`rounded-md px-3 py-2 text-sm font-extrabold capitalize transition ${template === item ? "bg-accent text-accent-foreground shadow-lg" : "text-primary-foreground hover:bg-primary-foreground/10"}`}>{item}</button>)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Palette className="size-4" />{accentOptions.map((item) => <button key={item.hsl} aria-label={item.name} title={item.name} type="button" onClick={() => setAccent(item.hsl)} className={`size-7 rounded-md border ${accent === item.hsl ? "border-primary-foreground" : "border-primary-foreground/30"}`} style={{ backgroundColor: `hsl(${item.hsl})` }} />)}</div>
              <button type="button" onClick={() => setDarkMode(!darkMode)} className="inline-flex items-center gap-2 rounded-md bg-primary-foreground/10 px-3 py-2 text-sm font-extrabold text-primary-foreground transition hover:bg-primary-foreground/15">{darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />} {darkMode ? "Light" : "Dark"}</button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 xl:grid-cols-[minmax(340px,0.86fr)_minmax(520px,1fr)_minmax(280px,0.58fr)] md:px-8">
        <div className="space-y-4 rounded-lg border border-border bg-panel-gradient p-4 shadow-panel">
          <div className="rounded-md border border-border bg-card p-4">
            <PanelTitle icon={UserRound} title="Personal information" />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Full name" value={resume.name} onChange={(name) => setResume({ ...resume, name })} />
              <Field label="Target role" value={resume.title} onChange={(title) => setResume({ ...resume, title })} />
              <Field label="Email" value={resume.email} onChange={(email) => setResume({ ...resume, email })} />
              <Field label="Phone" value={resume.phone} onChange={(phone) => setResume({ ...resume, phone })} />
              <div className="md:col-span-2"><Field label="Location" value={resume.location} onChange={(location) => setResume({ ...resume, location })} /></div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <PanelTitle icon={GripVertical} title="Section placement" action={<div className="flex flex-wrap gap-2"><button type="button" onClick={addCustomSection} className="inline-flex h-9 items-center gap-1 rounded-md bg-secondary px-2 text-xs font-extrabold text-secondary-foreground"><Plus className="size-3" /> Custom</button>{hiddenSections.length > 0 && <select className="h-9 rounded-md border border-input bg-card px-2 text-xs font-bold" onChange={(event) => { if (event.target.value) setVisibleSections([...visibleSections, event.target.value as SectionKey]); }} value=""><option value="">Add section</option>{hiddenSections.map((section) => <option key={section} value={section}>{sectionLabels[section]}</option>)}</select>}</div>} />
            <div className="grid gap-2">
              {sectionOrder.filter((section) => visibleSections.includes(section)).map((section, index, list) => {
                const Icon = getSectionIcon(section);
                return <div key={section} draggable onDragStart={(event) => { setDraggedSection(section); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", section); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; if (draggedSection) reorderSection(draggedSection, section); }} onDrop={(event) => { event.preventDefault(); const source = (event.dataTransfer.getData("text/plain") as SectionKey) || draggedSection; if (source) reorderSection(source, section); setDraggedSection(null); }} onDragEnd={() => setDraggedSection(null)} className={`flex cursor-grab items-center justify-between gap-2 rounded-md border p-2 transition active:cursor-grabbing ${draggedSection === section ? "border-secondary bg-preview-soft opacity-70" : "border-border bg-muted"}`}><span className="flex items-center gap-2 text-sm font-extrabold"><GripVertical className="size-4 text-muted-foreground" /><Icon className="size-4 text-secondary" />{getSectionLabel(section)}</span><div className="flex gap-1"><IconButton label="Move up" disabled={index === 0} onClick={() => moveSection(section, -1)}><ArrowUp className="size-4" /></IconButton><IconButton label="Move down" disabled={index === list.length - 1} onClick={() => moveSection(section, 1)}><ArrowDown className="size-4" /></IconButton><IconButton label="Remove section" onClick={() => setVisibleSections(visibleSections.filter((item) => item !== section))}><Trash2 className="size-4" /></IconButton></div></div>;
              })}
            </div>
          </div>

          <ResumeForm resume={resume} setResume={setResume} improveBullet={improveBullet} removeCustomSection={removeCustomSection} />
        </div>

        <aside className="xl:sticky xl:top-5 xl:self-start">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-extrabold uppercase text-muted-foreground"><span>Live A4 preview</span><span>{template} · ATS {atsScore}/100</span></div>
          <article ref={previewRef} className={`mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden bg-preview p-[14mm] shadow-paper print:shadow-none ${template === "minimal" ? "space-y-5" : "space-y-6"} ${template === "creative" ? "border-l-[10px] border-secondary" : template === "modern" ? "border-t-[10px] border-secondary" : "border border-border"}`}>
            <header className={`${template === "modern" ? "grid gap-5 border-b border-border pb-5 sm:grid-cols-[1fr_auto]" : "border-b border-border pb-5"}`}>
              <div>
                <h2 className="font-display text-[34pt] leading-none text-primary">{resume.name}</h2>
                <p className="mt-2 text-[13pt] font-extrabold text-secondary">{resume.title}</p>
              </div>
              <div className="mt-4 grid gap-1 text-[9pt] font-bold text-muted-foreground sm:mt-0">
                <span className="flex items-center gap-2"><Mail className="size-3 text-secondary" />{resume.email}</span>
                <span className="flex items-center gap-2"><Phone className="size-3 text-secondary" />{resume.phone}</span>
                <span>{resume.location}</span>
              </div>
            </header>
            {activeSections.map(renderPreviewSection)}
          </article>
        </aside>

        <aside className="space-y-4 rounded-lg border border-border bg-panel-gradient p-4 shadow-panel xl:sticky xl:top-5 xl:self-start">
          <PanelTitle icon={Sparkles} title="AI & export" />
          <div className="grid gap-2">
            <button type="button" disabled={isBusy} onClick={improveResume} className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-3 py-3 text-sm font-extrabold text-secondary-foreground transition hover:translate-y-[-1px] disabled:opacity-60"><Wand2 className="size-4" /> Improve entire resume</button>
            <button type="button" disabled={isBusy} onClick={getFeedback} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-3 text-sm font-extrabold transition hover:border-secondary"><Bot className="size-4" /> {harshMode ? "Harsh HR feedback" : "Get resume feedback"}</button>
            <label className="flex items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm font-extrabold"><span>Harsh HR Mode</span><input type="checkbox" checked={harshMode} onChange={(event) => setHarshMode(event.target.checked)} /></label>
          </div>

          <div className="rounded-md border border-border bg-card p-3">
            <label className="grid gap-2 text-sm font-extrabold">Job role
              <select value={role} onChange={(event) => setRole(event.target.value as JobRole)} className="h-10 rounded-md border border-input bg-card px-2 text-sm font-bold">
                {Object.keys(roleKeywords).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <button type="button" onClick={getKeywords} disabled={isBusy} className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-extrabold text-primary-foreground">Suggest keywords</button>
          </div>

          <div className="rounded-md border border-border bg-card p-3">
            <div className="mb-2 flex items-center justify-between text-sm font-extrabold"><span>ATS score</span><span>{atsScore}/100</span></div>
            <div className="h-3 overflow-hidden rounded-md bg-muted"><div className="h-full rounded-md bg-secondary transition-all" style={{ width: `${atsScore}%` }} /></div>
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs font-semibold leading-5 text-muted-foreground">{validation.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={downloadPdf} disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-extrabold text-primary-foreground"><Download className="size-4" /> PDF</button>
            <button type="button" onClick={shareResume} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-extrabold"><Share2 className="size-4" /> Share</button>
            <button type="button" onClick={saveVersion} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-extrabold"><Save className="size-4" /> Save</button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-extrabold"><Upload className="size-4" /> Import<input type="file" accept=".txt,.pdf,text/plain,application/pdf" className="sr-only" onChange={importResume} /></label>
          </div>

          {versions.length > 0 && <div className="rounded-md border border-border bg-card p-3"><h3 className="mb-2 text-sm font-extrabold">Saved versions</h3><div className="grid gap-2">{versions.map((version) => <button key={version.id} type="button" onClick={() => loadVersion(version)} className="rounded-md bg-muted px-3 py-2 text-left text-xs font-bold text-muted-foreground hover:text-foreground">{version.name}</button>)}</div></div>}

          <div className="rounded-md border border-border bg-card p-3"><h3 className="mb-2 text-sm font-extrabold">Resume tips</h3><div className="mb-3 flex flex-wrap gap-1">{actionTips.map((tip) => <span key={tip} className="rounded-sm bg-preview-soft px-2 py-1 text-xs font-extrabold text-primary">{tip}</span>)}</div><ul className="list-disc space-y-1 pl-4 text-xs font-semibold leading-5 text-muted-foreground">{achievementTips.map((tip) => <li key={tip}>{tip}</li>)}</ul></div>
          {aiNotes.length > 0 && <div className="rounded-md border border-border bg-card p-3"><h3 className="mb-2 text-sm font-extrabold">AI notes</h3><ul className="list-disc space-y-1 pl-4 text-xs font-semibold leading-5 text-muted-foreground">{aiNotes.map((note) => <li key={note}>{note}</li>)}</ul></div>}
        </aside>
      </section>
    </main>
  );
};

const PreviewHeading = ({ children }: { children: ReactNode }) => <h3 className="mb-2 font-sans text-[8.5pt] font-extrabold uppercase tracking-normal text-primary">{children}</h3>;

const ResumeForm = ({ resume, setResume, improveBullet, removeCustomSection }: { resume: Resume; setResume: Dispatch<SetStateAction<Resume>>; improveBullet: (kind: "experience" | "projects", itemIndex: number, bulletIndex: number) => void; removeCustomSection: (sectionId: string) => void }) => {
  const updateEducation = (index: number, key: keyof Education, value: string) => setResume((current) => ({ ...current, education: current.education.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const updateExperience = (index: number, key: keyof Experience, value: string | string[]) => setResume((current) => ({ ...current, experience: current.experience.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const updateProject = (index: number, key: keyof Project, value: string | string[]) => setResume((current) => ({ ...current, projects: current.projects.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const updateCustomSection = (sectionId: string, changes: Partial<CustomSection>) => setResume((current) => ({ ...current, customSections: current.customSections.map((section) => section.id === sectionId ? { ...section, ...changes } : section) }));
  const updateCustomField = (sectionId: string, fieldId: string, changes: Partial<CustomField>) => setResume((current) => ({ ...current, customSections: current.customSections.map((section) => section.id === sectionId ? { ...section, fields: section.fields.map((field) => field.id === fieldId ? { ...field, ...changes } : field) } : section) }));

  return <>
    <div className="rounded-md border border-border bg-card p-4"><PanelTitle icon={UserRound} title="Summary / About" /><Field label="Professional summary" value={resume.summary} onChange={(summary) => setResume({ ...resume, summary })} multiline /></div>
    <div className="rounded-md border border-border bg-card p-4"><PanelTitle icon={LinkIcon} title="Social links" action={<button type="button" className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-extrabold text-secondary-foreground" onClick={() => setResume({ ...resume, links: [...resume.links, { id: id(), label: "Custom", url: "" }] })}><Plus className="size-3" /> Add</button>} />
      <div className="grid gap-3">{resume.links.map((link, index) => <div key={link.id} className="grid gap-2 rounded-md bg-muted p-3 md:grid-cols-[0.7fr_1fr_auto]"><Field label="Label" value={link.label} onChange={(label) => setResume({ ...resume, links: resume.links.map((item) => item.id === link.id ? { ...item, label } : item) })} /><Field label="URL" value={link.url} onChange={(url) => setResume({ ...resume, links: resume.links.map((item) => item.id === link.id ? { ...item, url } : item) })} /><div className="flex items-end"><IconButton label="Remove link" onClick={() => setResume({ ...resume, links: resume.links.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="size-4" /></IconButton></div></div>)}</div>
    </div>
    <div className="rounded-md border border-border bg-card p-4"><PanelTitle icon={BriefcaseBusiness} title="Experience" action={<button type="button" className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-extrabold text-secondary-foreground" onClick={() => setResume({ ...resume, experience: [...resume.experience, { id: id(), company: "", role: "", years: "", bullets: [""] }] })}><Plus className="size-3" /> Add</button>} />
      <div className="grid gap-3">{resume.experience.map((item, index) => <div key={item.id} className="grid gap-3 rounded-md bg-muted p-3"><div className="grid gap-3 md:grid-cols-3"><Field label="Company" value={item.company} onChange={(value) => updateExperience(index, "company", value)} /><Field label="Role" value={item.role} onChange={(value) => updateExperience(index, "role", value)} /><Field label="Years" value={item.years} onChange={(value) => updateExperience(index, "years", value)} /></div><BulletEditor bullets={item.bullets} onChange={(bullets) => updateExperience(index, "bullets", bullets)} onImprove={(bulletIndex) => improveBullet("experience", index, bulletIndex)} />{resume.experience.length > 1 && <button type="button" className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-bold text-muted-foreground" onClick={() => setResume({ ...resume, experience: resume.experience.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="size-4" /> Remove experience</button>}</div>)}</div>
    </div>
    <div className="rounded-md border border-border bg-card p-4"><PanelTitle icon={Layers3} title="Projects" action={<button type="button" className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-extrabold text-secondary-foreground" onClick={() => setResume({ ...resume, projects: [...resume.projects, { id: id(), name: "", link: "", bullets: [""] }] })}><Plus className="size-3" /> Add</button>} />
      <div className="grid gap-3">{resume.projects.map((item, index) => <div key={item.id} className="grid gap-3 rounded-md bg-muted p-3"><div className="grid gap-3 md:grid-cols-2"><Field label="Project name" value={item.name} onChange={(value) => updateProject(index, "name", value)} /><Field label="Link" value={item.link} onChange={(value) => updateProject(index, "link", value)} /></div><BulletEditor bullets={item.bullets} onChange={(bullets) => updateProject(index, "bullets", bullets)} onImprove={(bulletIndex) => improveBullet("projects", index, bulletIndex)} />{resume.projects.length > 1 && <button type="button" className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-bold text-muted-foreground" onClick={() => setResume({ ...resume, projects: resume.projects.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="size-4" /> Remove project</button>}</div>)}</div>
    </div>
    <div className="rounded-md border border-border bg-card p-4"><PanelTitle icon={GraduationCap} title="Education" action={<button type="button" className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-extrabold text-secondary-foreground" onClick={() => setResume({ ...resume, education: [...resume.education, { id: id(), school: "", degree: "", years: "", details: "" }] })}><Plus className="size-3" /> Add</button>} />
      <div className="grid gap-3">{resume.education.map((item, index) => <div key={item.id} className="grid gap-3 rounded-md bg-muted p-3"><div className="grid gap-3 md:grid-cols-3"><Field label="School" value={item.school} onChange={(value) => updateEducation(index, "school", value)} /><Field label="Degree" value={item.degree} onChange={(value) => updateEducation(index, "degree", value)} /><Field label="Years" value={item.years} onChange={(value) => updateEducation(index, "years", value)} /></div><Field label="Details" value={item.details} onChange={(value) => updateEducation(index, "details", value)} multiline />{resume.education.length > 1 && <button type="button" className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-bold text-muted-foreground" onClick={() => setResume({ ...resume, education: resume.education.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="size-4" /> Remove education</button>}</div>)}</div>
    </div>
    <div className="rounded-md border border-border bg-card p-4"><PanelTitle icon={Sparkles} title="Skills" /><div className="grid gap-3"><Field label="Technical skills" value={resume.technicalSkills.join("\n")} onChange={(value) => setResume({ ...resume, technicalSkills: parseList(value) })} multiline /><Field label="Non-technical skills" value={resume.softSkills.join("\n")} onChange={(value) => setResume({ ...resume, softSkills: parseList(value) })} multiline /></div></div>
    {resume.customSections.map((section) => <div key={section.id} className="rounded-md border border-border bg-card p-4"><PanelTitle icon={Layers3} title={section.title || "Custom section"} action={<button type="button" className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-extrabold text-muted-foreground" onClick={() => removeCustomSection(section.id)}><Trash2 className="size-3" /> Delete</button>} />
      <div className="grid gap-3"><Field label="Section title" value={section.title} onChange={(title) => updateCustomSection(section.id, { title })} />{section.fields.map((field) => <div key={field.id} className="grid gap-2 rounded-md bg-muted p-3 md:grid-cols-[0.75fr_1fr_auto]"><Field label="Field label" value={field.label} onChange={(label) => updateCustomField(section.id, field.id, { label })} /><Field label="Field value" value={field.value} onChange={(value) => updateCustomField(section.id, field.id, { value })} multiline /><div className="flex items-end"><IconButton label="Remove field" onClick={() => updateCustomSection(section.id, { fields: section.fields.filter((item) => item.id !== field.id) })}><Trash2 className="size-4" /></IconButton></div></div>)}<button type="button" className="inline-flex w-fit items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-extrabold text-secondary-foreground" onClick={() => updateCustomSection(section.id, { fields: [...section.fields, { id: id(), label: "Field", value: "" }] })}><Plus className="size-4" /> Add custom field</button></div>
    </div>)}
  </>;
};

export default Index;
