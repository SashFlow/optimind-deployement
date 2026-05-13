import React from 'react'
import { Document } from "@shared/components/Document";
import { getLocale } from "next-intl/server";

const DemoLayout = async ({ children }: { children: React.ReactNode }) => {
  const locale = await getLocale();
  return     <Document locale={locale}>
           {children}
      </Document>
}

export default DemoLayout