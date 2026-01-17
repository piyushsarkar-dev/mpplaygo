"use client";
import React from 'react'

export default function AuthCodeError() {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen'>
        <h1 className='text-2xl font-bold'>Authentication Error</h1>
        <p className='text-muted-foreground'>There was an issue signing you in.</p>
    </div>
  )
}
