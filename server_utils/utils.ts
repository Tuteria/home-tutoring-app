// import {
//   SAMPLEREQUEST,
//   SAMPLESEARCH_RESULTS,
//   TUTORJOBLIST_DATA
// } from "@gbozee/shared-lib/src/components/products/private-lessons/_sampleData";
// import allCountries from "./countries.json";
// import regions from "./regions.json";
import {
  getRelevantScoreExcludingPrice,
  removeExcludedTutors,
} from "./search-fns";
import {
  interpretTutorData,
  determineTutorTotalPrice,
} from "@tuteria/shared-lib/src/home-tutoring/request-flow/tutor-fns";

export function createSearchFilter(requestData, searchIndex = 0) {
  let {
    filters = {},
    lessonDetails: { lessonSchedule },
    teacherKind,
  } = requestData;
  const request = requestData.splitRequests[searchIndex];
  let lessonDays = request.lessonDays || [];
  if (lessonDays.length === 0) {
    lessonDays = lessonSchedule.lessonDays;
  }

  const contactInfo = requestData.contactDetails;
  // also send down the booking days and time for active bookings.
  // get the regions that are related to the request region and then
  // include tutors that fall in said region.
  // active booking lessonDays filter would happen on the client.
  // send down exam preparation expreience which tallies with the purpose from the request.
  // send down lesson preference i.e max no of hours etc.
  const searchFilters = {
    searchSubject: request.searchSubject, // priority 1. tutor must have this subject if not then it is not part of the result.
    subjectGroup: request.subjectGroup.join(","), // most of the subjects in subjectGroup
    // teacherOption: request.teacherOption,
    specialNeeds: request.specialNeeds.filter((x) => x !== "None").join(","),
    curriculum: request.curriculum.join(","), // must have all the curriculum
    class: request.class.join(","), // must have selected all the classes.
    lessonDays: lessonDays.join(","), // tutors that are free on all of the lessonDays
    lessonTime: lessonSchedule.lessonTime, // must be available at this time.
    region: contactInfo.region,
    state: contactInfo.state,
    vicinity: contactInfo.vicinity,
    country: contactInfo.country,
    teacherKind,
    searchIndex,
  };
  let lessonType = requestData.lessonDetails.lessonType || filters?.lessonType;
  if (lessonType == "online") {
    delete searchFilters.region;
  }
  return searchFilters;
}
export function parseTransportData(state_with_radius = [], { contactDetails }) {
  let farePerKM = 0;
  let distanceThreshold = 0;
  if (contactDetails.state) {
    let found = state_with_radius.find((o) => o.state == contactDetails.state);
    if (found) {
      farePerKM = found.farePerKM;
      distanceThreshold = found.distanceThreshold;
    }
  }
  return {
    farePerKM,
    distanceThreshold,
  };
}
export function parceAcademicData(arrayOfArray) {
  let [
    subjects,
    purposes,
    classes,
    tuteriaSubjects,
    hourlyTimes,
    slotRanges,
    classGroup,
    specialities,
  ] = arrayOfArray;
  // tuteria subject mapping to client subject. This is an array and not all
  // the subjects are mapped.
  let subjectMappingToTuteria = subjects.map((o) => ({
    name: o.shortName,
    tuteria_subject: o.tuteria_subject,
  }));
  // Transforming the purpose from the sheet in order to build the academic data
  let transformedPurposes = purposes.map((o) => {
    return {
      ...o,
      subjects: o.subjects.split(",").map((x) => {
        let displayName = subjects.find((s) => s.shortName === x);
        if (displayName) {
          return {
            name: displayName.name,
            shortName: displayName.displayName || displayName.shortName,
            isPreselected: displayName.preSelected === "TRUE",
          };
        }
        return undefined;
      }),
    };
  });
  let transformedClasses = classes.map((o) => {
    return {
      ...o,
      purposes: o.purposes.split(",").map((j) => {
        let r = transformedPurposes.find((s) => s.id === j);
        if (r) {
          return r;
        }
        return undefined;
      }),
    };
  });
  // This is responsible for what would be sent to the backend. This maps the client subject with
  // the subject names supported by our backend.
  let transformedTuteriaSubjects = tuteriaSubjects.map((o) => {
    return {
      ...o,
      mappings: o.mappings.split(","),
    };
  });
  let result = {};
  transformedClasses
    .filter((o) => o !== undefined)
    .forEach((o) => {
      result[o["class"]] = o;
    });
  let slotResult = slotRanges.map((o) => {
    return {
      ...o,
      hourlyTimes: hourlyTimes
        .filter((j) => j.slot === o.slot)
        .map((o) => o.hourly_times)
        .join(","),
    };
  });
  let classGroupResult = {};
  classGroup.forEach((cls) => {
    let value = classGroupResult[cls.group];
    if (!value) {
      value = [];
    }
    if (!value.includes(cls.class)) {
      value.push(cls.class);
    }
    classGroupResult[cls.group] = value;
  });
  let rr = Object.keys(classGroupResult).map((o) => ({
    name: o,
    group: classGroupResult[o],
  }));
  specialities = specialities.map((o) => ({
    ...o,
    subjects: o.subjects.split(","),
  }));
  return {
    academicData: result,
    tuteriaSubjects: transformedTuteriaSubjects,
    timeSlots: slotResult,
    classGroup: rr,
    subjectTuteriaMapping: subjectMappingToTuteria,
    specialities,
  };
  // return [
  //   result,
  //   transformedTuteriaSubjects,
  //   slotResult,
  //   rr,
  //   subjectMappingToTuteria,
  // ];
}
function parseTuteriaSubject(tuteriaSubjects, subject) {
  let found = tuteriaSubjects.find((o) => o.mappings.includes(subject));
  if (found) {
    return found.tuteria_subjects;
  }
  return undefined;
}
function newRevertToClientSubject(pairMapping, subjectArray) {
  let result = pairMapping.filter((u) =>
    subjectArray
      .map((o) => o.toLowerCase())
      .includes(u.tuteria_subject.toLowerCase())
  );
  return result.map((o) => o.name);
}
function transformAcademicData(academicData) {
  let result = [];
  Object.keys(academicData).forEach((key, index) => {
    let instance = academicData[key];
    let purposes = instance.purposes.map((o) => o.subjects).flatMap((o) => o);
    result.push({ name: key, subjects: purposes });
  });
  return result;
}
function getClientSubjectInfo(shortName, academicData) {
  let found = transformAcademicData(academicData).find((o) => {
    return o.subjects
      .map((s) => s.shortName.toLowerCase())
      .includes(shortName.toLowerCase());
  });
  if (found) {
    let foundIndex = found.subjects.find(
      (u) => u.shortName.toLowerCase() == shortName.toLowerCase()
    );
    return { name: foundIndex.name, shortName: foundIndex.shortName };
  }
  return {
    name: shortName,
    shortName,
  };
}
function revertToClientSubject(tuteriaSubjects, subject) {
  let found = tuteriaSubjects.find((o) => o.tuteria_subjects === subject);
  if (found) {
    return found.mappings;
  }
  return [];
}
export function getTuteriaSearchSubject(searchSubject, rawAcademicData) {
  let { tuteriaSubjects } = parceAcademicData(rawAcademicData);
  let tuteriaSearchSubject = parseTuteriaSubject(
    tuteriaSubjects,
    searchSubject
  );
  return { name: tuteriaSearchSubject };
}
export function convertRequestToServerCompatibleFormat(
  rawAcademicData,
  searchData
) {
  let { searchIndex, searchSubject, subjectGroup, state, lessonTime, ...rest } =
    searchData;
  let { tuteriaSubjects, classGroup, timeSlots, specialities } =
    parceAcademicData(rawAcademicData);
  let tuteriaSearchSubject = parseTuteriaSubject(
    tuteriaSubjects,
    searchSubject
  );
  let tuteriaSubjectGroup = [
    ...new Set(
      subjectGroup
        .split(",")
        .map((o) => parseTuteriaSubject(tuteriaSubjects, o))
    ),
  ];
  let faculties = specialities
    .filter((o) => o.subjects.includes(searchSubject))
    .map((o) => o.speciality);
  if (searchData.teacherKind.toLowerCase() !== "specialized teachers") {
    faculties = [];
  }
  let tutorClass = rest.class
    .split(",")
    .map((str) => str.replace(/\s+/g, " "))
    .map((o) => {
      let f = classGroup.find((j) => j.group.includes(o));
      return f?.name;
    })
    .filter((u) => Boolean(u));

  let result = {
    ...rest,
    faculties,
    searchSubject: tuteriaSearchSubject || searchSubject,
    searchGroup: tuteriaSubjectGroup.join(",") || subjectGroup,
    state,
    lessonTime,
    class: tutorClass.join(","),
  };
  let selectedTimeSlot = timeSlots.find((o) =>
    o.hourlyTimes.includes(lessonTime)
  );
  if (selectedTimeSlot) {
    result = { ...result, ...selectedTimeSlot };
  }
  return result;
}

export function convertServerResultToRequestCompatibleFormat(
  searchResult,
  rawAcademicData,
  searchSubject,
  faculties = [],
  tutorCourses = []
) {
  let { academicData, tuteriaSubjects, subjectTuteriaMapping, specialities } =
    parceAcademicData(rawAcademicData);
  let transformed = searchResult.map((o) => {
    let revertedSubjects = [
      ...new Set(
        newRevertToClientSubject(subjectTuteriaMapping, o.subjectList)
      ),
      // o.subjectList
      // .map((v) => revertToClientSubject(tuteriaSubjects, v))
      // .flatMap((o) => o)
      // ),
    ];
    let tt = revertedSubjects
      .map((u) => getClientSubjectInfo(u, academicData))
      // .map((u) => u.name); // don't know whether to use name or shortname
      .map((u) => u.shortName); // don't know whether to use name or shortname
    return {
      ...o,
      rating: parseFloat(o.rating) || 0,
      specialities: [
        ...new Set(setTutorSpecialities(o.education, tutorCourses)),
      ],
      subject: {
        ...o.subject,
        name: searchSubject || o.subject.name,
        tuteriaName: o.subject.name || null,
        related: o.subject.related || [],
        // related: revertToClientSubject(tuteriaSubjects, o.subject.name) // uses the same mapping used by the search
      },
      // subjectList: [...new Set(tt)] // uses the academic subject mapping which might intentionally skip some subjects.
    };
  });
  transformed = transformed.filter((r) => r.subject.hourlyRate >= 0);
  // if (faculties.length > 0) {
  //   return transformed.filter((o) => {
  //     let r = intersection(faculties, o.specialities);
  //     return r.length > 0;
  //   });
  // }
  return transformed;
}
function setTutorSpecialities(tutorEducationArray, specialities) {
  let result = tutorEducationArray
    .map((o) => {
      let b = specialities.filter(
        (u) => u.course.toLowerCase() === o.course.toLowerCase()
      );
      return b.map((o) => o.speciality);
    })
    .flat()
    .filter((o) => o);
  return result;
}
export function useTestInfo(slug) {
  return {
    tutorsData: [
      // SAMPLESEARCH_RESULTS[0][8],
      // SAMPLESEARCH_RESULTS[1][5],
      // SAMPLESEARCH_RESULTS[2][8]
    ],
    requestData: {
      // ...SAMPLEREQUEST,
      // splitRequests: SAMPLEREQUEST.splitRequests.map((o, i) => {
      //   let tutors = ["tutorId9", "tutorId12", "tutorId19"];
      //   return {
      //     ...o,
      //     tutorId: tutors[i]
      //   };
      // }),
      bookingID: "sampleBookingID",
    },
    paymentInfo: {
      // tutors,
      ...{
        slug,
        walletBalance: 50000,
        tutors: [
          {
            userId: "tutorId9",
            subject: {
              hourlyRate: 5000,
              hourlyDiscount: 0,
              discountForExtraStudents: 10,
            },
            newTutorDiscount: 0,
            distance: 32,
            firstName: "Adeleke",
            lastName: "Benson",
            photo: "https://randomuser.me/api/portraits/women/95.jpg",
          },
          {
            userId: "tutorId12",
            subject: {
              hourlyRate: 2800,
              hourlyDiscount: 0,
              discountForExtraStudents: 10,
            },
            newTutorDiscount: 0,
            distance: 22,
            firstName: "Adamson",
            lastName: "Benson",
            photo: "https://randomuser.me/api/portraits/men/35.jpg",
          },

          {
            userId: "tutorId19",
            subject: {
              hourlyRate: 2500,
              hourlyDiscount: 0,
              discountForExtraStudents: 10,
            },
            newTutorDiscount: 0,
            distance: 32,
            firstName: "Atinuke",
            lastName: "Benson",
            photo: "https://randomuser.me/api/portraits/men/36.jpg",
          },
        ],
        tuitionFee: 329600,
        totalLessons: 48,
        totalDiscount: 0,
        transportFare: 0,
        couponDiscount: 0,
        distanceThreshold: 20,
        fareParKM: 25,
        currency: "₦",
      },
    },
    status: "pending",
    // agent: requestInfo.agent,
  };
}

export function buildPaymentRequest(
  amount,
  paymentInfo,
  requestInfo,
  kind = "full"
) {
  let paymentRequest = {
    amount: amount,
    currency: paymentInfo.currency.toUpperCase(),
    // order: requestInfo.bookingID,
    order: requestInfo.slug,
    user: {
      email: requestInfo.contactDetails.email,
      phone: requestInfo.contactDetails.phone,
      first_name: requestInfo.contactDetails.firstName,
      last_name: requestInfo.contactDetails.lastName,
    },
    processor_info: {
      // title: `Payment for ${classInfo.related_subject} class`,
      // description: `Enrollment for the ${classInfo.related_subject} class`
      title:
        kind == "full"
          ? `Payment for lessons with order ${requestInfo.slug}`
          : `Speaking fee payment`,
      description:
        kind == "full" ? `Home tutoring payment` : `Speaking fee payment`,
      // "items":{
      //   "ielts lessons": 4000
      // }
    },
  };

  return paymentRequest;
}

export function getCurrency(currency) {
  let currencies = [
    { symbol: "₦", value: "ngn", country: "NG" },
    { symbol: "€", value: "eur", country: "NG" },
    // {symbol:"₵",value:"ghs",country:"GH"},
    { symbol: "£", value: "gbp", country: "NG" },
    { symbol: "$", value: "usd", country: "NG" },
  ];
  return currencies.find((x) => x.symbol === currency);
}

export function convertToJobListData(data, tutor_id) {
  return data.map(
    ({
      slug,
      tutorResponse,
      contactDetails,
      lessonDetails,
      tutor_info,
      paymentInfo,
      status = "",
      agent = {},
      ...request
    }) => {
      let tInfo = Array.isArray(tutor_info) ? tutor_info[0] : tutor_info;
      let rou = {
        tutorResponse,
        slug,
        status,
        contactDetails,
        lessonDetails,
        agent,
        paymentInfo: {
          ...paymentInfo,
          tutor:
            paymentInfo.tutor ||
            (paymentInfo?.lessonPayments || []).find(
              (o) => o.tutor.userId === tutor_id
            ) ||
            null,
        },
        tutor_info: { ...tInfo, tutorId: tutor_id },
        ...request,
      };
      return rou;
    }
  );
}

function intersection(setA, setB) {
  let _intersection = new Set();
  for (let elem of new Set(setB)) {
    if (new Set(setA).has(elem)) {
      _intersection.add(elem);
    }
  }
  return [..._intersection];
}
export function concatListItems(list) {
  if (list.length < 1) {
    return "";
  } else if (list.length === 1) {
    return list[0];
  } else {
    const duplicatedList = [...list];
    const lastItem = duplicatedList.pop();
    let result = duplicatedList.join(", ");
    result += ` and ${lastItem}`;
    return result;
  }
}

export function rankResult(uniqueResults, searchObj, requestData) {
  let tutorDataOptions = uniqueResults.map((tutor) => {
    return {
      ...tutor,
      otherDetails: interpretTutorData(tutor, requestData, searchObj),
    };
  });
  return getRelevantScoreExcludingPrice(
    uniqueResults,
    tutorDataOptions.map((o) => ({
      ...o.otherDetails,
      userId: o.userId,
    })),
    searchObj
  );
}

export function trimSearchResult(
  tutorOptions = [],
  selectedTutorIDs = [],
  requestData = {},
  searchObj = {},
  specialities = [],
  deniedTutors = [],
  rank = false,
  options = {}
) {
  // let config =
  console.log("TOTAL", { tutorOptions, searchObj, requestData });
  let uniqueResults = removeExcludedTutors(
    selectedTutorIDs,
    deniedTutors,
    specialities,
    tutorOptions,
    searchObj,
    requestData,
    options
  );
  // if (rank) {

  return rankResult(uniqueResults, searchObj, requestData);
  // return getRelevantScoreExcludingPrice(
  //   uniqueResults,
  //   tutorDataOptions.map((o) => ({
  //     ...o.otherDetails,
  //     userId: o.userId,
  //   })),
  //   searchObj
  // );
  // // }
  // return uniqueResults;
}

// functions for updating request data for the new flow

function determinePayment(
  lessonSchedule,
  selectedTutor,
  numberOfStudents = 1,
  delivery = "physical",
  distanceThreshold,
  farePerKM,
  subjectName,
  tuteriaName
) {
  let lessonDuration = lessonSchedule ? lessonSchedule.lessonDuration : "";
  let lessonHours = lessonSchedule ? lessonSchedule.lessonHours : "";
  let lessonDays = lessonSchedule.lessonDays;
  // let { lessonDays, names: arrayOfStudents, selectedTutor: ost } = self;
  let newTutorDiscount = selectedTutor.newTutorDiscount || 0;
  let distanceFromClient = selectedTutor.distance || 0;
  let tutorName = selectedTutor.firstName;
  let billableDistance =
    delivery === "physical" && distanceFromClient > distanceThreshold
      ? distanceFromClient - distanceThreshold
      : 0;
  let priceInfo = determineTutorTotalPrice(selectedTutor, {
    lessonHours,
    lessonDays: lessonDays.length,
    lessonDuration,
    numberOfStudents,
  });

  let transportCost =
    priceInfo.students > 0
      ? billableDistance * farePerKM * 2 * priceInfo.lessons
      : 0;

  let discount =
    priceInfo.students > 0 ? priceInfo.amount * (newTutorDiscount / 100) : 0;

  return {
    // tutor: selectedTutor,
    tutor: {
      userId: selectedTutor.userId,
      subject: {
        hourlyRate: selectedTutor.subject.hourlyRate,
        hourlyDiscount: selectedTutor.subject.hourlyDiscount,
        discountForExtraStudents:
          selectedTutor.subject.discountForExtraStudents,
        tuteriaName,
        name: subjectName,
      },
      // subject: selectedTutor.subject.shortSummary,
      level: selectedTutor.level,
      newTutorDiscount: selectedTutor.newTutorDiscount,
      distance: selectedTutor.distance || 0,
      firstName: selectedTutor.firstName,
      lastName: selectedTutor.lastName,
      photo: selectedTutor.photo,
    },
    students: priceInfo.students,
    lessons: priceInfo.lessons,
    lessonRate: priceInfo.chargePerLesson,
    lessonFee: priceInfo.amount,
    perStudentFee: priceInfo.tuitionPerStudent,
    extraStudent: priceInfo.extraStudentTuition,
    firstBookingDiscount: discount,
    name: tutorName,
    distance: distanceFromClient,
    transportFare: transportCost,
  };
}

// export function generatePaymentInfo(
//   requestData,
//   discountObj = { discount: 0 },
//   selectedTutors = []
// ) {
//   let {
//     splitRequests: selectedSplits = [],
//     lessonDetails,
//     filters,
//   } = requestData;
//   let { lessonSchedule: oldLessonSchedule, lessonType } = lessonDetails;

//   let lessonHours = oldLessonSchedule ? oldLessonSchedule.lessonHours : "";

//   let daysRequested = oldLessonSchedule ? oldLessonSchedule.lessonDays : [];
//   let daysSelected = [];
//   selectedSplits
//     .filter((split) => split.names.length > 0)
//     .map((split) => daysSelected.push(...split.lessonDays));
//   daysSelected = [...new Set([...daysSelected])];

//   let delivery = Boolean(filters.delivery) ? filters.delivery : lessonType;

//   let lessonPayments = selectedSplits.map((o, index) => {
//     let lD = {
//       lessonDays: o.lessonDays,
//       lessonHours: o.lessonHours,
//       lessonDuration: o.lessonDuration,
//       lessonUrgency: o.lessonUrgency,
//       lessonTime: o.lessonTime,
//     };
//     let lessonSchedule = lD;
//     if (!lessonSchedule.lessonHours) {
//       lessonSchedule.lessonHours = oldLessonSchedule.lessonHours;
//     }
//     if (lessonSchedule.lessonDays.length === 0) {
//       lessonSchedule.lessonDays = oldLessonSchedule.lessonDays;
//     }
//     if (!lessonSchedule.lessonDuration) {
//       lessonSchedule.lessonDuration = oldLessonSchedule.lessonDuration;
//     }
//     let selectedTutor = selectedTutors[index];
//     return determinePayment(
//       lessonSchedule,
//       selectedTutor,
//       o.names.length,
//       delivery,
//       self.distanceThreshold,
//       self.farePerKM,
//       o.searchSubject,
//       selectedTutor.subject.tuteriaName
//     );
//   });
//   let tuitionFee = 0,
//     totalLessons = 0,
//     totalDiscount = 0,
//     transportFare = 0;

//   for (let i = 0; i < lessonPayments.length; i++) {
//     tuitionFee += Math.round(lessonPayments[i].lessonFee);
//     totalLessons += lessonPayments[i].lessons;
//     totalDiscount += Math.round(lessonPayments[i].firstBookingDiscount);
//     transportFare += Math.round(lessonPayments[i].transportFare);
//   }
//   // conditionally apply discount logic only when there isn't any discount applied by tutor.
//   let couponDiscount = 0;
//   function calculateTotalDiscount(self, amount) {
//     if (self.discountType === "flat") {
//       return self.discount;
//     }
//     return (self.discount * amount) / 100;
//   }
//   if (discountObj) {
//     couponDiscount = calculateTotalDiscount(discountObj, tuitionFee);
//     totalDiscount += couponDiscount;
//   }
//   let appliedDiscount = totalDiscount > 0;

//   let totalTuition = tuitionFee + transportFare - totalDiscount;
//   let isBillableDistance = transportFare > 0 && delivery === "physical";

//   let activeTeacherIDs = selectedSplits
//     .filter((split) => split.names.length > 0)
//     .map((teacher) => teacher.selectedTutor.userId);

//   const getLessonsPerDay = (day) => {
//     let days = selectedSplits.filter(
//       (split) => split.lessonDays.includes(day) && split.names.length > 0
//     );
//     return days.length;
//   };

//   return {
//     lessonPayments,
//     totalTuition,
//     tuitionFee,
//     totalLessons,
//     totalDiscount,
//     transportFare,
//     isBillableDistance,
//     activeTeacherIDs,
//     daysRequested,
//     daysSelected,
//     getLessonsPerDay,
//     appliedDiscount,
//     couponDiscount,
//     discountCode: discountObj?.discountCode || "",
//     hoursOfLesson: lessonHours,
//   };
// }

export function updateSplitRequests(currentSplits, currentTutor, index) {
  let selectedTutors = [];
  currentSplits.forEach((o, i) => {
    selectedTutors.push(o.tutorId);
  });
  let updatedTutors = selectedTutors.map((o, i) => {
    if (i == index) {
      return currentTutor;
    }
    return o;
  });
  return currentSplits.map((o, i) => {
    return { ...o, tutorId: updatedTutors[i] };
  });
}
