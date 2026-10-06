[out:json][timeout:240];
(
  nwr["amenity"~"^(cafe|restaurant|pub|bar|fast_food|biergarten|food_court)$"](around:100000,12.9716,77.5946);
  nwr["shop"~"^(coffee|bakery)$"](around:100000,12.9716,77.5946);
  nwr["craft"="brewery"](around:100000,12.9716,77.5946);
);
out center tags;
