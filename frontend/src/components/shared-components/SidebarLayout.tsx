// src/shared-components/SidebarLayout.tsx (or .jsx)
import React from "react";

interface SidebarLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export default function SidebarLayout({
  sidebar,
  children,
}: SidebarLayoutProps) {
  return (
    <div className="flex">
      {/* Sidebar */}
      <aside
        className="w-72 flex-shrink-0 bg-white border-r-4 border-gray-200 sticky top-0 self-start"
        style={{
          maxHeight: "100vh",
          height: "100vh",
          overflowY: "auto",
          zIndex: 10,
        }}
      >
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
