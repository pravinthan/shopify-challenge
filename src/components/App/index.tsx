import "../../styles/index.scss";
import styles from "./styles.module.scss";
import { ReactComponent as SearchIcon } from "../../assets/search-icon.svg";
import { useEffect, useRef, useState, MouseEvent } from "react";
import "react-responsive-modal/styles.css";
import { Modal } from "react-responsive-modal";

interface IMovie {
  id: string;
  title: string;
  releaseYear: string;
}

interface IAPIMovieResponse {
  Poster: string;
  Title: string;
  Type: string;
  Year: string;
  imdbID: string;
}

const App: React.FC = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchedMovies, setSearchedMovies] = useState<IMovie[]>([]);
  const [nominatedMovies, setNominatedMovies] = useState<IMovie[]>([]);
  const [apiError, setApiError] = useState("");
  const [openShareModal, setOpenShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string>("Copy");
  const shareURLRef = useRef<HTMLInputElement>(null);
  const [isCopyURLButtonDisabled, setCopyURLButtonDisabled] = useState<boolean>(
    false
  );
  const [openSharedListModal, setOpenSharedListModal] = useState(false);
  const [sharedMovies, setSharedMovies] = useState<IMovie[]>([]);

  // Load saved nominated movies
  useEffect(() => {
    setNominatedMovies(() =>
      JSON.parse(localStorage.getItem("nominatedMovies") || "[]")
    );
  }, []);

  // If shared link, then disallow editing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.has("list")) {
      try {
        const idList: string[] = JSON.parse(params.get("list") || "[]");

        idList.forEach(async (id) => {
          // Call API given the movie ID
          const res = await (
            await fetch(
              `https://www.omdbapi.com/?apikey=${process.env.REACT_APP_API_KEY}&i=${id}`
            )
          ).json();

          if (res.Response === "True") {
            setSharedMovies((sharedMovies) => [
              ...sharedMovies,
              mapMovieApiResToMovieObject(res),
            ]);

            setOpenSharedListModal(() => true);
          }
        });
      } catch {
        console.error("No list shared");
      }
    }
  }, []);

  const mapMovieApiResToMovieObject = (
    movieApiRes: IAPIMovieResponse
  ): IMovie => ({
    id: movieApiRes.imdbID,
    title: movieApiRes.Title,
    releaseYear: movieApiRes.Year,
  });

  const handleSearchChange = async (val: string) => {
    // Update search input value
    setSearchInput(() => val);

    // Call API
    const res = await (
      await fetch(
        `https://www.omdbapi.com/?apikey=${process.env.REACT_APP_API_KEY}&s=${val}`
      )
    ).json();

    if (res.Response === "True") {
      // Update searched movies list after filtering and mapping to our own Movie object
      setSearchedMovies(() =>
        (res.Search as IAPIMovieResponse[])
          .filter((movie) => movie.Type === "movie")
          .map(mapMovieApiResToMovieObject)
      );
    } else {
      // Empty list if any error occurs
      setSearchedMovies(() => []);
      setApiError(() => res.Error);
    }
  };

  // Save new nominated movies
  const saveNominatedMoviesToStorage = (nominatedMovies: IMovie[]) => {
    try {
      localStorage.setItem("nominatedMovies", JSON.stringify(nominatedMovies));
    } catch {
      console.error("Could not save nominated movies");
    }
  };

  const handleNominateClick = (movie: IMovie) => {
    setNominatedMovies((nominatedMovies) => {
      const newNominatedMovies = [...nominatedMovies, movie];
      saveNominatedMoviesToStorage(newNominatedMovies);

      return newNominatedMovies;
    });
  };

  const handleRemoveClick = (id: IMovie["id"]) => {
    setNominatedMovies((nominatedMovies) => {
      const newNominatedMovies = nominatedMovies.filter(
        (nominatedMovie) => nominatedMovie.id !== id
      );
      saveNominatedMoviesToStorage(newNominatedMovies);

      return newNominatedMovies;
    });
  };

  const onClickCopy = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    navigator.clipboard.writeText(shareURLRef.current?.value || "");
    setCopySuccess(() => "Copied!");
    setCopyURLButtonDisabled(() => true);

    setTimeout(() => {
      setCopySuccess(() => "Copy");
      setCopyURLButtonDisabled(() => false);
    }, 3000);
  };

  const createShareLink = () =>
    `${window.location.origin}?list=${JSON.stringify(
      nominatedMovies.map((nominatedMovie) => nominatedMovie.id)
    )}`;

  return (
    <div className={styles.container}>
      <div className={styles["center-container"]}>
        <h1>The Shoppies</h1>
        <div className={`${styles["card-container"]} ${styles.column}`}>
          <b>Movie Title:</b>
          <div className={styles["search-container"]}>
            <label>
              <SearchIcon />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={styles.search}
                placeholder="Find a movie here"
              />
            </label>
          </div>
        </div>

        <div className={styles["two-column"]}>
          <div className={styles["card-container"]}>
            {searchedMovies.length === 0 ? (
              <>
                <h2>Results</h2>
                <div className={styles["no-search"]}>
                  {searchInput.length > 0
                    ? apiError
                    : "Type in the search box above!"}
                </div>
              </>
            ) : (
              <>
                <h2>Results for "{searchInput}"</h2>
                <ul>
                  {searchedMovies.map((searchedMovie) => (
                    <div className={styles["movie-row"]} key={searchedMovie.id}>
                      <li>
                        {searchedMovie.title} ({searchedMovie.releaseYear})
                      </li>
                      <button
                        className={styles["theme-button"]}
                        onClick={() => handleNominateClick(searchedMovie)}
                        disabled={
                          nominatedMovies.length === 5 ||
                          nominatedMovies.find(
                            (nominatedMovie) =>
                              nominatedMovie.id === searchedMovie.id
                          ) !== undefined
                        }
                      >
                        Nominate
                      </button>
                    </div>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className={styles["card-container"]}>
            <h2>
              Nominations{" "}
              {nominatedMovies.length !== 5 && (
                <>({5 - nominatedMovies.length} left)</>
              )}
            </h2>
            {nominatedMovies.length === 5 && (
              <div className={styles.alert}>
                You have nominated all 5 movies!
                <button
                  className={styles["theme-button"]}
                  onClick={() => setOpenShareModal(() => true)}
                >
                  Share List
                </button>
                <Modal
                  open={openShareModal}
                  center
                  onClose={() => setOpenShareModal(() => false)}
                  classNames={{ modal: styles["share-modal"] }}
                >
                  <span className={styles["share-title"]}>
                    Share Your Nominated Movies
                  </span>
                  <div className={styles["share-url-container"]}>
                    <input
                      className={styles["share-url"]}
                      ref={shareURLRef}
                      value={createShareLink()}
                      readOnly
                    />
                    <button
                      className={styles["share-copy-button"]}
                      onClick={onClickCopy}
                      disabled={isCopyURLButtonDisabled}
                    >
                      {copySuccess}
                    </button>
                  </div>
                </Modal>
              </div>
            )}
            {nominatedMovies.length > 0 && (
              <ul>
                {nominatedMovies.map((nominatedMovie) => (
                  <div className={styles["movie-row"]} key={nominatedMovie.id}>
                    <li>
                      {nominatedMovie.title} ({nominatedMovie.releaseYear})
                    </li>
                    <button
                      className={styles["theme-button"]}
                      onClick={() => handleRemoveClick(nominatedMovie.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={openSharedListModal}
        center
        onClose={() => setOpenSharedListModal(() => false)}
        classNames={{ modal: styles["share-modal"] }}
      >
        <span className={styles["share-title"]}>
          The Person Who Sent This Link Has Nominated:
        </span>
        {sharedMovies.map((sharedMovie) => (
          <div key={sharedMovie.id}>
            {sharedMovie.title} ({sharedMovie.releaseYear})
          </div>
        ))}
      </Modal>
    </div>
  );
};

export default App;
