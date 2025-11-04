import addCourseIcon from "../assets/addCourse.svg";

function BlankCourseOutput() {
  return (
    <>
      <button className="flex flex-row items-center justify-center p-2 bg-gray-200 w-full h-24 rounded-md opacity-60 hover:opacity-100">
        <img src={addCourseIcon} alt="addCourse icon" className="h-6 w-6" />
      </button>
    </>
  );
}

export default BlankCourseOutput;
