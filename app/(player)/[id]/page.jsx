import { getSongsById } from "@/lib/fetch";
import Recomandation from "../_components/Recomandation";
import SongHero from "../_components/SongHero";

export const generateMetadata = async ({ params }) => {
  const title = await getSongsById(params.id);
  const data = await title.json();
  const song = data?.data?.[0];

  if (!song) {
    return {
      title: "MpPlaygo",
      description: "Open-Source music streamer.",
    };
  }

  const artistName = song?.artists?.primary?.[0]?.name || "unknown";
  const songImage =
    song?.image?.[2]?.url || song?.image?.[1]?.url || song?.image?.[0]?.url;

  return {
    title: song.name,
    description: `Listen to "${song.name}" by ${artistName} from the album "${song.album?.name || ""}".`,
    openGraph: {
      title: song.name,
      description: `Listen to "${song.name}" by ${artistName}.`,
      type: "music.song",
      url: song.url,
      images: [
        {
          url: songImage,
          width: 1200,
          height: 630,
          alt: song.name,
        },
      ],
      music: {
        album: song.album?.url,
        release_date: song.releaseDate,
        musician: artistName,
      },
    },
    twitter: {
      card: "summary_large_image",
      title: song.name,
      description: `Listen to "${song.name}" by ${artistName}.`,
      images: songImage,
    },
  };
};

export default function Page({ params }) {
  return (
    <div className="pt-4 md:pt-6">
      <SongHero id={params.id} />
      <Recomandation id={params.id} />
    </div>
  );
}
