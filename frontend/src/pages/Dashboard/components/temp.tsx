<div className="flex flex-row flex-1 gap-2 min-h-0">
  <div className="flex flex-col w-102 h-full min-h-0 bg-white border-gray-200 border-2 m-2 shadow overflow-hidden">
    {activeMajorProgress[tabIndex] ? (
      <MajorRequirementList major_progress={activeMajorProgress[tabIndex]} />
    ) : (
      <div>Loading degree requirements...</div>
    )}
  </div>

  <div className="flex flex-col flex-1 h-full min-h-0 bg-white border-gray-200 border-2 m-2 p-2 shadow overflow-hidden min-w-0">
    {activeMajorProgress[tabIndex] ? (
      <MajorRequirementGraph major_progress={activeMajorProgress[tabIndex]} />
    ) : (
      <div>Loading degree requirements...</div>
    )}
  </div>
</div>;
