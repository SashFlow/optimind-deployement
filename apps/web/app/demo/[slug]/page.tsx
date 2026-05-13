'use client'

import React from 'react'
import { useState } from 'react';
import { useDemoContext } from '@context/DemoProvider';
import { Card, CardContent, CardHeader, CardTitle  } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import Link from 'next/link';
import { Venus as GenderFemaleIcon, Mars as GenderMaleIcon } from 'lucide-react';
import { popularIndianLanguages } from '@constants';
import { WelcomeImage } from '@components/app/welcome-view';

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


function AudioWaveformPreview() {
  return (
    <div className="bg-muted/40 flex aspect-[3/2] w-full items-center justify-center gap-1 rounded-lg border px-4 py-3">
      <WelcomeImage />
    </div>
  );
}


const DemoPage = () => {
  const { usecase, loading } = useDemoContext();
  const [selectedAgentSlug, setSelectedAgentSlug] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

  if (loading || usecase == null) {
    return null
  }

  const nextHref =
    selectedAgentSlug == null
      ? null
      : `/demo/${usecase.token}/try?language=${selectedLanguage}&selectedAgent=${selectedAgentSlug}`;


  if (usecase.approvedSessions === 0) {
    return <div>Trial period is over</div>
  }
  return (
      <main className="bg-background min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-10 md:px-10">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">Sashflow</h1>
        </div>

        <section className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {agents.map((agent) => {
              const isSelected = agent.name === selectedAgentSlug;

              return (
                <Card
                  key={agent.name}
                  className={isSelected ? 'border-primary ring-primary/20 ring-2' : undefined}
                >
                  <CardHeader className="space-y-4">
                    {usecase.mode === 'audio' ? (
                      <AudioWaveformPreview />
                    ) : (
                      <div className="bg-muted/40 flex aspect-[3/2] w-full items-center justify-center gap-1 rounded-lg border px-4 py-3">
                        {agent.icon}
                      </div>
                    )}
                    <CardTitle className="text-center text-base">Dr. {agent.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
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

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
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
                <Link href={nextHref}>Next</Link>
              </Button>
            ) : (
              <Button className="w-full sm:w-auto" disabled>
                Next
              </Button>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default DemoPage