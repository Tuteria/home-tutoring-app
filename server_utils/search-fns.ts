import { differenceInCalendarDays as diffInDays } from "date-fns";
import { DEGREE_DATA, SCHEDULE_DATA } from "./data";
const transformBookings = (activeBookings = []) => {
  let allSchedule = [];
  let result = {};

  activeBookings.forEach((booking) => allSchedule.push(...booking.schedule));
  allSchedule.forEach((schedule) => {
    let day = schedule.split(":")[0].trim();
    let time = schedule.split(":")[1].trim();

    if (result[day]) {
      result = { ...result, [day]: [...result[day], time] };
    } else {
      result = { ...result, [day]: [time] };
    }
  });

  return result;
};

export const pipeFunc =
  (...fns) =>
  (x) =>
    fns.reduce((y, f) => f(y), x);

export function getTeachingExperience(tutorData) {
  let teachingWorkHistory = tutorData.workHistory.filter(
    (workHistory) => workHistory.isTeachingRole
  );

  const workReducer = (accumulator, currentValue) => {
    if (currentValue.isCurrent) {
      let today = new Date();
      let diffInYears = today.getFullYear() - parseInt(currentValue.startYear);
      return accumulator + diffInYears;
    }

    if (currentValue.endYear === currentValue.startYear) {
      let diffInYears =
        parseInt(currentValue.endYear) - parseInt(currentValue.startYear) + 1;
      return accumulator + diffInYears;
    }

    let diffInYears =
      parseInt(currentValue.endYear) - parseInt(currentValue.startYear);
    return accumulator + diffInYears;
  };

  return teachingWorkHistory.reduce(workReducer, 0);
}

function getTeachingExperienceScore(tutorData) {
  let experience = getTeachingExperience(tutorData);
  if (experience > -1 && experience <= rankFx.experience) return experience;
  if (experience > rankFx.experience) return rankFx.experience;
}
function getEducationScore(tutorData) {
  let highestEducation = tutorData.education[0];
  let degree = DEGREE_DATA.find(
    (data) => data.abbrev === highestEducation.degree
  );
  if (degree !== undefined) return degree.rank;
  return 1;
}
function getMaxValue(tutors, key) {
  let valueArr = tutors.map((item) => item[key]);
  return Math.max(...valueArr);
}
export function calculateTutorAge(tutorData) {
  let birthday = new Date(tutorData.dateOfBirth);
  let milliSecDiff = Date.now() - birthday.getTime();
  let ageDate = new Date(milliSecDiff);

  return Math.abs(ageDate.getUTCFullYear() - 1970);
}
export const removeExcludedTutors = (
  tutorIDs,
  deniedTutors,
  specialities,
  tutorOptions = [],
  searchObj,
  requestData,
  options: any = {}
) => {
  const removeSelectedTutors = (tutorDataArray) => {
    let excludeTutors = [...tutorIDs, ...deniedTutors];
    if (excludeTutors.length)
      return tutorDataArray.filter(
        (tutor) => !excludeTutors.includes(tutor.userId)
      );
    return tutorDataArray;
  };

  const filterBySpecialities = (tutorDataArray) => {
    if (specialities.length) {
      tutorDataArray.filter((tutor) =>
        tutor.specialities.some((speciality) =>
          specialities.includes(speciality)
        )
      );
    }
    return tutorDataArray;
  };

  const removeReachedMaxDeclines = (tutorDataArray) =>
    tutorDataArray.filter((tutor) => tutor.requestsDeclined < 3);

  const removeIgnoredRequests = (tutorDataArray) =>
    tutorDataArray.filter((tutor) => tutor.requestsNotResponded === 0);

  const declinedAllRequests = (tutor) =>
    tutor.totalJobsAssigned > 1 &&
    tutor.requestsDeclined === tutor.totalJobsAssigned;
  const removeDeclinedAllRequests = (tutorDataArray) =>
    tutorDataArray.filter((tutor) => !declinedAllRequests(tutor));

  const hasMultiplePendingJobs = (tutor) => {
    const previousPendingJobs =
      tutor.totalJobsAssigned -
      (tutor.requestPending +
        tutor.requestsDeclined +
        tutor.requestsNotResponded +
        tutor.totalJobsAccepted);

    const activeJobs =
      previousPendingJobs >= 0
        ? tutor.requestPending
        : tutor.requestPending + previousPendingJobs;
    if (activeJobs > 2) return true;
    return false;
  };

  const removeMultiplePendingJobs = (tutorDataArray) =>
    tutorDataArray.filter((tutor) => tutor.requestPending < 4);
  // tutorDataArray.filter(tutor => !hasMultiplePendingJobs(tutor));

  const removeOutdatedCalendar = (tutorDataArray) =>
    tutorDataArray.filter(
      (tutor) => diffInDays(new Date(), new Date(tutor.lastCalendarUpdate)) < 40
    );

  const removeMaxDays = (tutorDataArray) =>
    tutorDataArray.filter(
      (tutor) => tutor.maxDays >= searchObj.lessonDays.length
    );

  const removeMaxStudents = (tutorDataArray) =>
    tutorDataArray.filter(
      (tutor) => tutor.maxStudents >= searchObj.names.length
    );

  const removeMaxHours = (tutorDataArray) => {
    let hours = requestData.lessonDetails.lessonSchedule.lessonHours;
    return tutorDataArray.filter((tutor) => tutor.maxHours >= hours);
  };

  const removeFullyBookedTutors = (tutorDataArray) => {
    function maxBookings(tutor) {
      if (tutor.maxDays <= 2) return 1;
      if (tutor.maxDays > 2 && tutor.maxDays <= 6) return tutor.maxDays - 1;
      return 5;
    }

    return tutorDataArray.filter(
      (tutor) => tutor.activeBookings.length <= maxBookings(tutor)
    );
  };

  const removeUnavailableTutors = (tutorDataArray) => {
    const lessonDays = searchObj.lessonDays;

    function hasMatchingDays(availability) {
      const tutorsDays = Object.keys(availability);
      return lessonDays.every((day) => tutorsDays.includes(day));
    }

    return tutorDataArray.filter((tutor) =>
      hasMatchingDays(tutor.availability)
    );
  };

  const removeUnavailableTimes = (tutorDataArray) => {
    const { mapPeriodToTime } = SCHEDULE_DATA;
    const lessonDays = searchObj.lessonDays;
    let lessonTime = requestData.lessonDetails.lessonSchedule.lessonTime;
    let selectedPeriod;

    Object.entries(mapPeriodToTime).forEach(([period, times]) => {
      if (times.includes(lessonTime)) selectedPeriod = period;
    });

    let result = tutorDataArray.filter((tutor) =>
      lessonDays.every((day) =>
        tutor.availability[day].includes(selectedPeriod)
      )
    );

    return result;
  };

  const removeTutorsWithSameBookings = (tutorDataArray) => {
    const lessonDays = searchObj.lessonDays;

    let newData = tutorDataArray.filter((tutor) => {
      let availableDays = 0;
      if (tutor.activeBookings.length) {
        let bookings = transformBookings(tutor.activeBookings);

        lessonDays.forEach((day) => {
          let classesPerDay = bookings[day] ? bookings[day].length : 0;
          if (classesPerDay < 2) availableDays++;
        });

        if (lessonDays.length < 3) return lessonDays.length === availableDays;
        if (lessonDays.length >= 3)
          return lessonDays.length - availableDays <= 1;
      } else return true;
    });

    return newData;
  };
  let funcs = [removeSelectedTutors];
  if (options.filterBySpecialities) {
    funcs.push(filterBySpecialities);
  }
  if (options.removeReachedMaxDeclines) {
    funcs.push(removeReachedMaxDeclines);
  }
  if (options.removeIgnoredRequests) {
    funcs.push(removeIgnoredRequests);
  }
  if (options.removeDeclinedAllRequests) {
    funcs.push(removeDeclinedAllRequests);
  }
  if (options.removeMultiplePendingJobs) {
    funcs.push(removeMultiplePendingJobs);
  }
  if (options.removeOutdatedCalendar) {
    funcs.push(removeOutdatedCalendar);
  }
  if (options.removeMaxDays) {
    funcs.push(removeMaxDays);
  }
  if (options.removeMaxStudents) {
    funcs.push(removeMaxStudents);
  }
  if (options.removeMaxHours) {
    funcs.push(removeMaxHours);
  }
  if (options.removeUnavailableTutors) {
    funcs.push(removeUnavailableTutors);
  }
  if (options.removeUnavailableTimes) {
    funcs.push(removeUnavailableTimes);
  }
  if (options.removeFullyBookedTutors) {
    funcs.push(removeFullyBookedTutors);
  }
  if (options.removeTutorsWithSameBookings) {
    funcs.push(removeTutorsWithSameBookings);
  }
  return pipeFunc(...funcs)(tutorOptions);
};
const rankFx = {
  class: 6,
  subject: 6,
  curriculum: 6,
  purpose: 7,
  specialNeed: 6,
  video: 8,
  badge: 7,
  students: 5,
  lessons: 5,
  price: 12,
  headline: 10,
  description: 7,
  experience: 5,
  education: 5,
  distance: 4,
  calendar: 4,
  decline: -5,
};

export function getRelevantScoreExcludingPrice(
  tutorOptions,
  tutorDataOptions,
  searchObj
) {
  let maxStudents = getMaxValue(tutorOptions, "students");
  let maxLessons = getMaxValue(tutorOptions, "lessonsTaught");

  let tutorOptionsArray = tutorOptions.map((tutor) => {
    let tutorData = tutorDataOptions.find(
      (data) => data.userId === tutor.userId
    );
    let relevanceScore = 0;

    function matchCount(searchObjKey = "", tutorObjKey = "", weight) {
      let matchedCount = 0;
      if (searchObj[searchObjKey]?.length) {
        let matchedItems = searchObj[searchObjKey].filter((item) =>
          (tutor[tutorObjKey] || []).includes(item)
        );
        matchedCount =
          (matchedItems.length / searchObj[searchObjKey].length) * weight;
      }
      return matchedCount;
    }

    function getWordMatchCount(tutorObjKey = "") {
      let matchCount = 0;
      let mainText = tutor.subject[tutorObjKey].slice(0, 150).split(" ");
      let searchString = `${(searchObj.purposes || []).join(" ")} ${
        searchObj.searchSubject
      } ${tutorData.education[0]?.course || ""}`;

      let searchStringArray = [...new Set(searchString.split(" "))];

      searchStringArray.forEach((string) =>
        mainText.forEach((text) => {
          if (text.includes(string)) matchCount++;
        })
      );

      if (matchCount >= 5) return rankFx[tutorObjKey];
      if (matchCount === 4) return rankFx[tutorObjKey] / 1.5;
      if (matchCount === 3) return rankFx[tutorObjKey] / 2;
      if (matchCount === 2) return rankFx[tutorObjKey] / 2.5;
      if (matchCount === 1) return rankFx[tutorObjKey] / 3;
      return 0;
    }

    function getDistanceRank() {
      if (tutor.distance <= 3) return rankFx.distance;
      if (tutor.distance > 3 && tutor.distance <= 6) return rankFx.distance - 1;
      if (tutor.distance > 6 && tutor.distance <= 9) return rankFx.distance - 2;
      if (tutor.distance > 9 && tutor.distance <= 12)
        return rankFx.distance - 3;
      return 0;
    }

    function getDeclinedRank() {
      if (tutor.requestsDeclined === 2) return rankFx.decline;
      return 0;
    }

    function getCalendarUpdateRank() {
      const today = new Date();
      const lastUpdate = new Date(tutor.lastCalendarUpdate);
      const difference = diffInDays(today, lastUpdate);
      if (difference <= 14) return rankFx.calendar;
      if (difference > 14 && difference <= 28) return rankFx.calendar - 2;
      return 0;
    }

    let classRank = matchCount("class", "classesTaught", rankFx.class);
    let subjectRank = matchCount("subjectGroup", "subjectList", rankFx.subject);
    let curriculumRank = matchCount(
      "curriculum",
      "curriculum",
      rankFx.curriculum
    );
    let purposeRank = matchCount("purposes", "examsExperience", rankFx.purpose);
    let specialNeedsRank = matchCount(
      "specialNeeds",
      "specialNeedExpertise",
      rankFx.specialNeed
    );
    let distanceRank = getDistanceRank();
    let calendarRank = getCalendarUpdateRank();
    let declineRank = getDeclinedRank();

    let requestRank =
      classRank +
      subjectRank +
      curriculumRank +
      purposeRank +
      specialNeedsRank +
      distanceRank +
      calendarRank +
      declineRank;

    if (tutor.videoIntro) relevanceScore = relevanceScore + rankFx.video;
    if (tutorData.badges.length > 0)
      relevanceScore = relevanceScore + rankFx.badge;
    if (maxStudents > 0) {
      relevanceScore =
        relevanceScore + (tutor.students / maxStudents) * rankFx.students;
    }
    if (maxLessons > 0) {
      relevanceScore =
        relevanceScore + (tutor.lessonsTaught / maxLessons) * rankFx.lessons;
    }

    if (tutor.workHistory.length > 0) {
      relevanceScore = relevanceScore + getTeachingExperienceScore(tutor);
    }

    if (tutor.education.length > 0) {
      relevanceScore = relevanceScore + getEducationScore(tutorData);
    }

    if (tutor.subject.headline) {
      relevanceScore = relevanceScore + getWordMatchCount("headline");
    }

    if (tutor.subject.description) {
      relevanceScore = relevanceScore + getWordMatchCount("description");
    }
    if (tutor.workHistory.map((o) => o.isTeachingProfile).includes(true)) {
    }
    console.log(tutor);
    return {
      ...tutor,
      rank: relevanceScore + requestRank || 0,
      experience: getTeachingExperience(tutor) || 0,
      isIndemand: tutor.activeBookings.length > 1,
      age: calculateTutorAge(tutor),
      eduDegrees: tutor.education.map((obj) => obj.degree),
      eduGrades: [...new Set(tutor.education.map((obj) => obj.grade))].filter(
        Boolean
      ),
      eduCountries: [
        ...new Set(tutor.education.map((obj) => obj.country)),
      ].filter(Boolean),
      otherDetails: tutorData,
    };
  });

  return tutorOptionsArray;
}
