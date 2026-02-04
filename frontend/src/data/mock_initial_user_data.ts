import { mockSemesters } from "./mock_semesters";
import {type User} from "../types/type-user";
import { general_requirements_progress, cs_requirements_bs_progress, cs_requirements_ba_progress} from "./mock_major_progress";

export const initialUserData: User = {
  first_name: "dave",
  last_name: "bob",
  netID: "ac3499",
  onboard: true,
  FYP: {
    languageRequirement: "L1",
    //studentSemesters: mockSemesters,
    // degreeConfigurations: [general_requirements],
    degreeProgress: [general_requirements_progress, /*, cs_requirements_ba_progress*/],
    degreeProgress2: [{
      worksheetID: "ws_main",
      majors: [general_requirements_progress]
    }],
    statCount:{majorNum: 0, certificateNum: 0},
    worksheets: [
      {
        id: "ws_main",
        name: "Main Worksheet",
        studentSemesters: mockSemesters,
      },
    ],
  activeWorksheetID: "ws_main"
  }
};
