'use client'
import React from 'react'
import { DemoProvider } from "@context/DemoProvider"




const SlugLayout = ({ children, mode, slug }: { children: React.ReactNode, mode: string, slug: string }) => {
  
  return (
    <DemoProvider slug={slug}>
      {children}
    </DemoProvider>
  )
}

export default SlugLayout