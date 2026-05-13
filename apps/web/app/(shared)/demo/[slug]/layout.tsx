'use client'
import React from 'react'




const DemoLayout = ({ children, mode, slug }: { children: React.ReactNode, mode: string, slug: string }) => {
  
  return (
    <DemoProvider slug={slug}>
      {children}
    </DemoProvider>
  )
}

export default DemoLayout