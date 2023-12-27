async function main() {
    const CourseRating = await ethers.getContractFactory("CourseRating");

    // Start deployment, returning a promise that resolves to a contract object
    const course_rating = await CourseRating.deploy();
    console.log("Contract deployed to address:", course_rating.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });