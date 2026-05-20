import { Bell, Moon } from "lucide-react";
import { Card, CardContent } from "@/components/card";
import { Switch } from "@/components/switch";
import type { UserSettings } from "@/lib/api-client";

type SettingsKey = "dark_mode" | "show_notifications" | "email_notifications";

type SettingsPanelProps = {
  settings: UserSettings | null;
  loading: boolean;
  saving: SettingsKey | null;
  onChange: (key: SettingsKey, value: boolean) => void;
};

export function SettingsPanel({ settings, loading, saving, onChange }: SettingsPanelProps) {
  const disabled = loading || !settings;

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <Card>
        <CardContent className="space-y-5 p-4">
          <PanelTitle
            icon={<Bell className="h-4 w-4 text-blue-600" />}
            title="Notifications"
            description="Manage how you receive notifications"
          />
          <SettingRow
            label="Email Notifications"
            description="Receive notifications via email"
            checked={settings?.email_notifications ?? false}
            disabled={disabled || saving === "email_notifications"}
            onCheckedChange={(value) => onChange("email_notifications", value)}
          />
          <SettingRow
            label="Push Notifications"
            description="Receive notifications in the app"
            checked={settings?.show_notifications ?? false}
            disabled={disabled || saving === "show_notifications"}
            onCheckedChange={(value) => onChange("show_notifications", value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-4">
          <PanelTitle
            icon={<Moon className="h-4 w-4 text-blue-600" />}
            title="Appearance"
            description="Customize how Tracely looks"
          />
          <SettingRow
            label="Dark Mode"
            description="Toggle dark mode appearance"
            checked={settings?.dark_mode ?? false}
            disabled={disabled || saving === "dark_mode"}
            onCheckedChange={(value) => onChange("dark_mode", value)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function PanelTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950/30">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold leading-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}
