# Documentation des Routes des Commentaires

## Routes pour les Commentaires

### 1. Ajouter un Commentaire

**URL**: `https://map-point.netgraph.fr/api/comments/add`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "marker_id": 1,
    "comment": "This is a great marker!",
    "rating": 4
}
```

**Réponse Possible**:

```json
{
    "message": "Comment added successfully"
}
```

---

### 2. Obtenir les Commentaires d'un Marqueur

**URL**: `https://map-point.netgraph.fr/api/comments/:marker_id`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
[
    {
        "id": 1,
        "marker_id": 1,
        "user_id": 123,
        "comment": "This is a great marker!",
        "rating": 4,
        "username": "user1"
    },
    {
        "id": 2,
        "marker_id": 1,
        "user_id": 124,
        "comment": "I like this marker!",
        "rating": 5,
        "username": "user2"
    }
]
```

---

### 3. Mettre à jour un Commentaire

**URL**: `https://map-point.netgraph.fr/api/comments/update`  
**Méthode**: PUT  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "comment_id": 1,
    "comment": "Updated comment text",
    "rating": 5
}
```

**Réponse Possible**:

```json
{
    "message": "Comment updated successfully"
}
```

---

### 4. Supprimer un Commentaire

**URL**: `https://map-point.netgraph.fr/api/comments/:comment_id`  
**Méthode**: DELETE  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "message": "Comment deleted successfully"
}
```

---

# Explications Générales

1. **Ajouter un Commentaire**: Un utilisateur authentifié peut ajouter un commentaire et une note (entre 1 et 5) à un marqueur. Si un commentaire a déjà été ajouté par cet utilisateur pour ce marqueur, une erreur sera renvoyée.
2. **Obtenir les Commentaires d'un Marqueur**: Permet de récupérer tous les commentaires associés à un marqueur avec les informations de l'utilisateur qui les a postés.
3. **Mettre à jour un Commentaire**: L'utilisateur peut mettre à jour son commentaire et la note associée tant qu'il en est l'auteur.
4. **Supprimer un Commentaire**: Un utilisateur peut supprimer son propre commentaire.

Chaque route nécessite un jeton JWT valide à passer dans le header d'autorisation pour authentifier l'utilisateur.