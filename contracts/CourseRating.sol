// SPDX-License-Identifier: MIT
pragma solidity >=0.7.3;

contract CourseRating {

    // Structure to store course information
    struct Course {
        uint courseId;
        uint totalRating;
        uint numberOfRatings;
    }

    // Mapping to store courses
    mapping(uint => Course) public courses;

    // Event emitted when a course is rated
    event CourseRated(uint indexed courseId, uint rating);

    // Function to allow students to rate a course
    function rateCourse(uint courseId, uint rating) public {
        // Validate input
        require(courseId > 0, "Invalid courseId");
        require(rating >= 1 && rating <= 5, "Invalid rating. Rating must be between 1 and 5.");

        // Check if the course exists
        if (courses[courseId].courseId == 0) {
            // Initialize the course if it doesn't exist
            courses[courseId] = Course(courseId, 0, 0);
        }

        // Update the course rating
        courses[courseId].totalRating += rating;
        courses[courseId].numberOfRatings++;

        // Emit the CourseRated event
        emit CourseRated(courseId, rating);
    }


    function getAverageRating(uint courseId) public view returns (uint totalRating, uint numberOfRatings) {
        require(courses[courseId].courseId > 0, "Course does not exist");
        require(courses[courseId].numberOfRatings > 0, "No ratings for the course");

        // Return totalRating and numberOfRatings as a tuple
        return (courses[courseId].totalRating, courses[courseId].numberOfRatings);
    }

}
