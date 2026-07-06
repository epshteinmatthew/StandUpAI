'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AdminTab } from '@/lib/admin/tabs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminTabsProps {
  initialTab: AdminTab;
  goals: ReactNode;
  team: ReactNode;
  integrations: ReactNode;
  meetings: ReactNode;
}

export function AdminTabs({ initialTab, goals, team, integrations, meetings }: AdminTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  function onTabChange(value: string) {
    setTab(value as AdminTab);
    router.replace(`${pathname}?tab=${value}`, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="space-y-6">
      <TabsList>
        <TabsTrigger value="goals">Goals & deadlines</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
        <TabsTrigger value="meetings">Meeting logs</TabsTrigger>
      </TabsList>

      <TabsContent value="goals" className="space-y-6">
        {goals}
      </TabsContent>

      <TabsContent value="team">{team}</TabsContent>

      <TabsContent value="integrations">{integrations}</TabsContent>

      <TabsContent value="meetings">{meetings}</TabsContent>
    </Tabs>
  );
}
