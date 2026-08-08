import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import { getBlockedUsers } from "@/lib/blocks";
import { AppHeader } from "@/components/AppHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { EmailPrefToggle } from "@/components/settings/EmailPrefToggle";
import { BlockedUsersList } from "@/components/settings/BlockedUsersList";
import { NotificationsList } from "@/components/settings/NotificationsList";
import { C } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { userId, profile } = await getSessionProfile();
  if (!userId || !profile) redirect("/login?next=/settings");

  const [notifications, blockedUsers] = await Promise.all([
    getNotifications(userId),
    getBlockedUsers(userId),
  ]);

  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <AppHeader profile={profile} active="settings" />
      <main style={{ maxWidth: 620, margin: "0 auto", padding: "34px 22px 90px" }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 28px" }}>
          Réglages
        </h1>

        <section style={{ marginBottom: 44 }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.inkFaint, margin: "0 0 16px" }}>
            Profil
          </h2>
          <SettingsForm profile={profile} />
        </section>

        <section style={{ marginBottom: 44 }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.inkFaint, margin: "0 0 16px" }}>
            Préférences
          </h2>
          <EmailPrefToggle userId={userId} initial={profile.email_notifications} />
        </section>

        <section style={{ marginBottom: 44 }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.inkFaint, margin: "0 0 16px" }}>
            Contributeurs bloqués
          </h2>
          <BlockedUsersList userId={userId} initial={blockedUsers} />
        </section>

        <section>
          <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.inkFaint, margin: "0 0 16px" }}>
            Notifications
          </h2>
          <NotificationsList items={notifications} userId={userId} />
        </section>
      </main>
    </div>
  );
}
