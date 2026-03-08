import pandas as pd 
import json

def query_catalog(season):
    df = pd.read_csv(f"{season}.csv")
    data = df.to_dict(orient="records")

    found = {}
    sum_workloads = {}
    sum_ratings = {}
    courses_count = {}
    majors = {}
    average = {}

    for entry in data:
        listings = json.loads(entry["listings"])
        for lst in listings:
            if(found.get(lst["course_code"]) == True):
                continue
            found[lst["course_code"]] = True
            if(pd.isna(entry["average_workload"])):
                continue
            if(pd.isna(entry["average_rating"])):
                continue
            major = lst["subject"]
            majors[major] = True
            sum_workloads[major] = sum_workloads.get(major, 0) + entry["average_workload"] * entry["last_enrollment"]
            sum_ratings[major] = sum_ratings.get(major, 0) + entry["average_rating"] * entry["last_enrollment"]
            courses_count[major] = courses_count.get(major, 0) + entry["last_enrollment"] 

    for major in majors:
        average[major] = {}
        average[major]["rating"] = sum_ratings[major] / courses_count[major]
        average[major]["workload"] = sum_workloads[major] / courses_count[major]
    
    with open(f"{season}.json", "w") as f:
        json.dump(average, f, indent=4)

query_catalog("202601")


