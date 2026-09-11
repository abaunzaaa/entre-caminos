import perfilIlus from "../../assets/perfil-ilus.png";

export function AdminProfileHeroArt() {
  return (
    <div className="admin-profile-edit__hero-art" aria-hidden="true">
      <div className="admin-profile-edit__hero-frame">
        <img src={perfilIlus} alt="" className="admin-profile-edit__hero-img" />
      </div>
    </div>
  );
}
