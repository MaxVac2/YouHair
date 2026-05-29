import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  HardDrive, Mail, Presentation, Users, MonitorSmartphone, FileText,
  Table2, MessageSquare, Send, Shield, Flame, Sheet, MessagesSquare,
  FileEdit, BookOpen, MailOpen, UserSearch, Mic, Search, Database,
  ExternalLink,
} from "lucide-react";

const connectors = [
  { id: "google_drive", name: "Google Drive", description: "Upload and download files to and from Google Drive", icon: HardDrive, category: "Storage" },
  { id: "google_mail", name: "Gmail", description: "Read, send, and manage your emails", icon: Mail, category: "Email" },
  { id: "google_slides", name: "Google Slides", description: "Create and manage presentations", icon: Presentation, category: "Productivity" },
  { id: "hubspot", name: "HubSpot", description: "CRM platform for sales, marketing, and customer service", icon: Users, category: "CRM" },
  { id: "microsoft_powerpoint", name: "Microsoft PowerPoint", description: "Read and write presentations", icon: MonitorSmartphone, category: "Productivity" },
  { id: "perplexity", name: "Perplexity", description: "AI-powered search and answer engine", icon: Search, category: "AI" },
  { id: "bigquery", name: "BigQuery", description: "Query and analyze data in BigQuery", icon: Database, category: "Analytics" },
  { id: "contentful", name: "Contentful", description: "Headless CMS for content delivery", icon: FileText, category: "CMS" },
  { id: "elevenlabs", name: "ElevenLabs", description: "AI voice generation, text-to-speech, and speech-to-text", icon: Mic, category: "AI" },
  { id: "google_docs", name: "Google Docs", description: "Create and edit Google Docs documents", icon: FileEdit, category: "Productivity" },
  { id: "microsoft_onedrive", name: "Microsoft OneDrive", description: "Upload and read files", icon: HardDrive, category: "Storage" },
  { id: "slack", name: "Slack", description: "Send messages and interact with Slack workspaces", icon: MessageSquare, category: "Communication" },
  { id: "telegram", name: "Telegram", description: "Messaging platform with Bot API", icon: Send, category: "Communication" },
  { id: "wiz", name: "Wiz", description: "Cloud security platform and posture management", icon: Shield, category: "Security" },
  { id: "firecrawl", name: "Firecrawl", description: "AI-powered scraper, search and retrieval tool", icon: Flame, category: "AI" },
  { id: "google_sheets", name: "Google Sheets", description: "Read and update spreadsheet data", icon: Sheet, category: "Productivity" },
  { id: "microsoft_teams", name: "Microsoft Teams", description: "Send messages and manage channels", icon: MessagesSquare, category: "Communication" },
  { id: "microsoft_word", name: "Microsoft Word", description: "Read and write documents", icon: FileEdit, category: "Productivity" },
  { id: "twilio", name: "Twilio", description: "Cloud communications for SMS, voice, and messaging", icon: MessageSquare, category: "Communication" },
  { id: "google_calendar", name: "Google Calendar", description: "Create and manage calendar events", icon: Table2, category: "Productivity" },
  { id: "microsoft_excel", name: "Microsoft Excel", description: "Read and write spreadsheets", icon: Sheet, category: "Productivity" },
  { id: "microsoft_onenote", name: "Microsoft OneNote", description: "Read and write notes", icon: BookOpen, category: "Productivity" },
  { id: "microsoft_outlook", name: "Microsoft Outlook", description: "Read, send, and manage emails", icon: MailOpen, category: "Email" },
  { id: "ashby", name: "Ashby", description: "Recruiting and applicant tracking system", icon: UserSearch, category: "HR" },
];

// Group by category
const grouped = connectors.reduce<Record<string, typeof connectors>>((acc, c) => {
  (acc[c.category] ??= []).push(c);
  return acc;
}, {});

const categoryOrder = ["Productivity", "Communication", "Email", "Storage", "AI", "CRM", "Analytics", "CMS", "Security", "HR"];
const sortedCategories = categoryOrder.filter(c => grouped[c]);

const Integrations = () => {
  const handleConnect = (name: string) => {
    toast.info(`To connect ${name}, go to your Lovable project Settings → Connectors and set it up there.`, {
      duration: 6000,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect your favorite tools to automate your workflow.</p>
      </div>

      {sortedCategories.map((category) => (
        <div key={category}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category}</h2>
          <div className="rounded-xl divide-y divide-muted">
            {grouped[category].map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <c.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">{c.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs flex-shrink-0"
                  onClick={() => handleConnect(c.name)}
                >
                  Connect
                  <ExternalLink className="w-3 h-3 ml-1.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Integrations;
