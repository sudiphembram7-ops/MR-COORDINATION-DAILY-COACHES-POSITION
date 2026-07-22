function searchCoach(){

    const keyword = document
        .getElementById("searchBox")
        .value
        .toUpperCase();

    const cells = document.querySelectorAll(".editable");

    cells.forEach(cell => {

        cell.classList.remove("search-match");

        if(keyword === "") return;

        if(cell.innerText.toUpperCase().includes(keyword)){

            cell.classList.add("search-match");

            cell.scrollIntoView({
                behavior:"smooth",
                block:"center",
                inline:"center"
            });

        }

    });

}